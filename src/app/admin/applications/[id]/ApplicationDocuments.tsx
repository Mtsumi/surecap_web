"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApplicationMember } from "@/lib/adminApi";
import { regenerateApplicationSummary } from "@/lib/adminApi";
import {
  MemberDocument,
  documentTypeLabel,
  fetchMemberDocumentBlob,
  fetchSummaryPdfBlob,
  formatFileSize,
  isImageDocument,
  isPdfContentType,
  isPdfDocument,
  triggerBlobDownload,
} from "@/lib/adminDocuments";

export type PreviewTarget =
  | {
      kind: "member";
      document: MemberDocument;
      title: string;
    }
  | {
      kind: "summary";
      title: string;
      filename: string;
      contentType: string;
    };

type ApplicationDocumentsProps = {
  applicationId: number;
  members: ApplicationMember[];
  summaryPdfAvailable: boolean;
  dropboxDossierReady: boolean;
  memberRoleLabel: (role: string) => string;
  memberDisplayName: (member: ApplicationMember) => string;
  onSummaryRegenerated?: () => void;
};

function DocumentPreviewModal({
  applicationId,
  target,
  onClose,
}: {
  applicationId: number;
  target: PreviewTarget;
  onClose: () => void;
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filename =
    target.kind === "member" ? target.document.original_filename : target.filename;
  const fallbackContentType =
    target.kind === "member" ? target.document.content_type : target.contentType;
  const previewAsImage =
    target.kind === "member" ? isImageDocument(target.document) : false;
  const previewAsPdf =
    target.kind === "member"
      ? isPdfDocument(target.document)
      : isPdfContentType(target.contentType);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob =
          target.kind === "member"
            ? await fetchMemberDocumentBlob(
                applicationId,
                target.document.id,
                "inline",
                fallbackContentType
              )
            : await fetchSummaryPdfBlob(applicationId, "inline");
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Impossible d'ouvrir le fichier");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [applicationId, fallbackContentType, target]);

  const onDownload = useCallback(async () => {
    try {
      const blob =
        target.kind === "member"
          ? await fetchMemberDocumentBlob(
              applicationId,
              target.document.id,
              "attachment",
              fallbackContentType
            )
          : await fetchSummaryPdfBlob(applicationId, "attachment");
      triggerBlobDownload(blob, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du téléchargement");
    }
  }, [applicationId, fallbackContentType, filename, target]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={target.title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#e7e0d5] px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-[#292524]">{target.title}</h3>
            <p className="truncate text-xs text-[#78716c]">{filename}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void onDownload()}
              className="rounded border border-[#e7e0d5] px-3 py-1.5 text-xs font-medium text-[#3d5a45] hover:bg-[#f5f2eb]"
            >
              Télécharger
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-lg leading-none text-[#78716c] hover:bg-[#f5f2eb]"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex min-h-[50vh] flex-1 items-center justify-center overflow-auto bg-[#faf8f4] p-4">
          {loading ? (
            <p className="text-sm text-[#78716c]">Chargement…</p>
          ) : error ? (
            <p className="max-w-md text-center text-sm text-[#b91c1c]">{error}</p>
          ) : blobUrl && previewAsImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobUrl}
              alt={target.title}
              className="max-h-[75vh] max-w-full rounded shadow-sm"
            />
          ) : blobUrl && previewAsPdf ? (
            <object
              data={blobUrl}
              type="application/pdf"
              className="h-[75vh] w-full rounded border border-[#e7e0d5] bg-white"
            >
              <p className="p-4 text-center text-sm text-[#78716c]">
                Aperçu PDF indisponible dans ce navigateur. Utilisez Télécharger.
              </p>
            </object>
          ) : blobUrl ? (
            <p className="text-sm text-[#78716c]">
              Aperçu non disponible pour ce type de fichier. Utilisez Télécharger.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ApplicationDocuments({
  applicationId,
  members,
  summaryPdfAvailable,
  dropboxDossierReady,
  memberRoleLabel,
  memberDisplayName,
  onSummaryRegenerated,
}: ApplicationDocumentsProps) {
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);

  const membersWithDocs = members.filter((member) => (member.documents?.length ?? 0) > 0);
  const hasMemberDocs = membersWithDocs.length > 0;

  if (!summaryPdfAvailable && !hasMemberDocs && !dropboxDossierReady) {
    return (
      <p className="mt-2 text-sm text-[#78716c]">Aucun document téléversé pour cette demande.</p>
    );
  }

  const onDownloadMember = async (document: MemberDocument) => {
    const key = `doc-${document.id}`;
    setBusyKey(key);
    setError(null);
    try {
      const blob = await fetchMemberDocumentBlob(
        applicationId,
        document.id,
        "attachment",
        document.content_type
      );
      triggerBlobDownload(blob, document.original_filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du téléchargement");
    } finally {
      setBusyKey(null);
    }
  };

  const onDownloadSummary = async () => {
    setBusyKey("summary");
    setError(null);
    try {
      const blob = await fetchSummaryPdfBlob(applicationId, "attachment");
      triggerBlobDownload(blob, "application_summary.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du téléchargement");
    } finally {
      setBusyKey(null);
    }
  };

  const onRegenerateSummary = async () => {
    setRegeneratingSummary(true);
    setError(null);
    try {
      await regenerateApplicationSummary(applicationId);
      onSummaryRegenerated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de la génération du résumé");
    } finally {
      setRegeneratingSummary(false);
    }
  };

  return (
    <>
      <p className="mt-2 text-xs text-[#78716c]">
        Les fichiers sont chargés depuis Dropbox à la demande (aperçu ou téléchargement).
      </p>

      {error ? (
        <p className="mt-3 rounded border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-sm text-[#b91c1c]">
          {error}
        </p>
      ) : null}

      {dropboxDossierReady && !summaryPdfAvailable ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-sm text-[#78716c]">Le résumé PDF n&apos;a pas encore été généré.</p>
          <button
            type="button"
            disabled={regeneratingSummary}
            onClick={() => void onRegenerateSummary()}
            className="rounded border border-[#e7e0d5] px-3 py-1.5 text-xs font-medium text-[#3d5a45] hover:bg-[#f5f2eb] disabled:opacity-50"
          >
            {regeneratingSummary ? "Génération…" : "Générer le résumé PDF"}
          </button>
        </div>
      ) : null}

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#e7e0d5] text-xs uppercase text-[#a8a29e]">
            <th className="py-2 pr-3">Membre</th>
            <th className="py-2 pr-3">Type</th>
            <th className="py-2 pr-3">Fichier</th>
            <th className="py-2 pr-3">Taille</th>
            <th className="py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {summaryPdfAvailable ? (
            <tr className="border-b border-[#f0ebe3]">
              <td className="py-2 pr-3 text-[#57534e]">Dossier</td>
              <td className="py-2 pr-3 text-[#57534e]">Résumé</td>
              <td className="py-2 pr-3 text-[#78716c]">application_summary.pdf</td>
              <td className="py-2 pr-3 text-[#a8a29e]">—</td>
              <td className="py-2 text-right">
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPreview({
                        kind: "summary",
                        title: "Résumé du dossier",
                        filename: "application_summary.pdf",
                        contentType: "application/pdf",
                      })
                    }
                    className="text-xs font-medium text-[#57534e] underline-offset-2 hover:underline"
                  >
                    Aperçu
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === "summary"}
                    onClick={() => void onDownloadSummary()}
                    className="text-xs font-medium text-[#3d5a45] underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {busyKey === "summary" ? "…" : "Télécharger"}
                  </button>
                </div>
              </td>
            </tr>
          ) : null}

          {membersWithDocs.map((member) => {
            const memberLabel = `${memberRoleLabel(member.role)} — ${memberDisplayName(member)}`;
            return (member.documents ?? []).map((document) => {
              const label = documentTypeLabel(document.document_type);
              const key = `doc-${document.id}`;
              return (
                <tr key={document.id} className="border-b border-[#f0ebe3]">
                  <td className="py-2 pr-3 text-[#57534e]">{memberLabel}</td>
                  <td className="py-2 pr-3 text-[#57534e]">{label}</td>
                  <td
                    className="max-w-[12rem] truncate py-2 pr-3 text-[#78716c]"
                    title={document.original_filename}
                  >
                    {document.original_filename}
                  </td>
                  <td className="py-2 pr-3 text-[#a8a29e]">{formatFileSize(document.byte_size)}</td>
                  <td className="py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            kind: "member",
                            document,
                            title: label,
                          })
                        }
                        className="text-xs font-medium text-[#57534e] underline-offset-2 hover:underline"
                      >
                        Aperçu
                      </button>
                      <button
                        type="button"
                        disabled={busyKey === key}
                        onClick={() => void onDownloadMember(document)}
                        className="text-xs font-medium text-[#3d5a45] underline-offset-2 hover:underline disabled:opacity-50"
                      >
                        {busyKey === key ? "…" : "Télécharger"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>

      {!summaryPdfAvailable && !hasMemberDocs && dropboxDossierReady ? (
        <p className="mt-4 text-sm text-[#78716c]">Aucun document membre pour cette demande.</p>
      ) : null}

      {preview ? (
        <DocumentPreviewModal
          applicationId={applicationId}
          target={preview}
          onClose={() => setPreview(null)}
        />
      ) : null}
    </>
  );
}
