"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApplicationMember } from "@/lib/adminApi";
import { regenerateApplicationSummary } from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
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
        className="admin-card flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="admin-card-header flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-[var(--ml-ink)]">
              {target.title}
            </h3>
            <p className="truncate text-xs text-[var(--ml-steel)]">{filename}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => void onDownload()}
              className={adminUi.btnSecondary + " !px-3 !py-1.5 !text-xs"}
            >
              Télécharger
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-2 py-1 text-lg leading-none text-[var(--ml-steel)] hover:bg-[var(--ml-paper)]"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex min-h-[50vh] flex-1 items-center justify-center overflow-auto bg-[var(--ml-paper)] p-4">
          {loading ? (
            <p className={adminUi.empty}>Chargement…</p>
          ) : error ? (
            <p className={`${adminUi.alertError} max-w-md text-center`}>{error}</p>
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
              className="h-[75vh] w-full rounded border border-[var(--ml-line)] bg-white"
            >
              <p className={`${adminUi.empty} p-4 text-center`}>
                Aperçu PDF indisponible dans ce navigateur. Utilisez Télécharger.
              </p>
            </object>
          ) : blobUrl ? (
            <p className={adminUi.empty}>
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
    return <p className={adminUi.empty}>Aucun document téléversé pour cette demande.</p>;
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
      <p className="text-xs text-[var(--ml-steel)]">
        Les fichiers sont chargés depuis Dropbox à la demande (aperçu ou téléchargement).
      </p>

      {error ? <p className={`${adminUi.alertError} mt-3`}>{error}</p> : null}

      {dropboxDossierReady && !summaryPdfAvailable ? (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className={adminUi.empty}>Le résumé PDF n&apos;a pas encore été généré.</p>
          <button
            type="button"
            disabled={regeneratingSummary}
            onClick={() => void onRegenerateSummary()}
            className={adminUi.btnSecondary + " !px-3 !py-1.5 !text-xs"}
          >
            {regeneratingSummary ? "Génération…" : "Générer le résumé PDF"}
          </button>
        </div>
      ) : null}

      <div className={`${adminUi.tableWrap} mt-4`}>
        <table className={adminUi.table}>
          <thead>
            <tr>
              <th>Membre</th>
              <th>Type</th>
              <th>Fichier</th>
              <th>Taille</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {summaryPdfAvailable ? (
              <tr>
                <td>Dossier</td>
                <td>Résumé</td>
                <td className="text-[var(--ml-steel)]">application_summary.pdf</td>
                <td className="text-[var(--ml-steel)]">—</td>
                <td className="text-right">
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
                      className={adminUi.link + " text-xs font-medium"}
                    >
                      Aperçu
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === "summary"}
                      onClick={() => void onDownloadSummary()}
                      className={adminUi.link + " text-xs font-medium disabled:opacity-50"}
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
                  <tr key={document.id}>
                    <td>{memberLabel}</td>
                    <td>{label}</td>
                    <td
                      className="max-w-[12rem] truncate text-[var(--ml-steel)]"
                      title={document.original_filename}
                    >
                      {document.original_filename}
                    </td>
                    <td className="text-[var(--ml-steel)]">
                      {formatFileSize(document.byte_size)}
                    </td>
                    <td className="text-right">
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
                          className={adminUi.link + " text-xs font-medium"}
                        >
                          Aperçu
                        </button>
                        <button
                          type="button"
                          disabled={busyKey === key}
                          onClick={() => void onDownloadMember(document)}
                          className={adminUi.link + " text-xs font-medium disabled:opacity-50"}
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
      </div>

      {!summaryPdfAvailable && !hasMemberDocs && dropboxDossierReady ? (
        <p className={`${adminUi.empty} mt-4`}>Aucun document membre pour cette demande.</p>
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
