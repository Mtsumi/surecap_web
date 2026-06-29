"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApplicationMember } from "@/lib/adminApi";
import {
  MemberDocument,
  documentTypeLabel,
  fetchMemberDocumentBlob,
  fetchSummaryPdfBlob,
  formatFileSize,
  isImageContentType,
  isPdfContentType,
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
  memberRoleLabel: (role: string) => string;
  memberDisplayName: (member: ApplicationMember) => string;
};

function PdfPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#f5f2eb] text-[#78716c]">
      <div className="flex h-12 w-10 items-center justify-center rounded border border-[#d6d3d1] bg-white text-xs font-semibold uppercase tracking-wide text-[#b91c1c]">
        PDF
      </div>
      <span className="line-clamp-2 px-2 text-center text-[11px] leading-tight">{label}</span>
    </div>
  );
}

function DocumentThumbnail({
  applicationId,
  document,
  label,
  onPreview,
}: {
  applicationId: number;
  document: MemberDocument;
  label: string;
  onPreview: () => void;
}) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(isImageContentType(document.content_type));
  const [error, setError] = useState(false);
  const showImage = isImageContentType(document.content_type);

  useEffect(() => {
    if (!showImage) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    fetchMemberDocumentBlob(applicationId, document.id, "inline")
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setThumbUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [applicationId, document.id, showImage]);

  const onDownload = async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const blob = await fetchMemberDocumentBlob(applicationId, document.id, "attachment");
      triggerBlobDownload(blob, document.original_filename);
    } catch {
      // parent page may surface errors later
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-[#e7e0d5] bg-white shadow-sm transition hover:border-[#c9c0b3]">
      <button
        type="button"
        onClick={onPreview}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#faf8f4] text-left"
      >
        {showImage ? (
          loading ? (
            <div className="h-full w-full animate-pulse bg-[#ede8df]" />
          ) : thumbUrl && !error ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbUrl}
              alt={label}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <PdfPlaceholder label={label} />
          )
        ) : isPdfContentType(document.content_type) ? (
          <PdfPlaceholder label={label} />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-[#78716c]">
            {label}
          </div>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 pb-2 pt-8 text-xs font-medium text-white">
          {label}
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <p className="min-w-0 truncate text-[11px] text-[#78716c]" title={document.original_filename}>
          {document.original_filename}
        </p>
        <button
          type="button"
          onClick={onDownload}
          className="shrink-0 text-[11px] font-medium text-[#3d5a45] underline-offset-2 hover:underline"
        >
          Télécharger
        </button>
      </div>
      <p className="px-2.5 pb-2 text-[10px] text-[#a8a29e]">{formatFileSize(document.byte_size)}</p>
    </article>
  );
}

function SummaryThumbnail({
  applicationId,
  onPreview,
}: {
  applicationId: number;
  onPreview: () => void;
}) {
  const onDownload = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const blob = await fetchSummaryPdfBlob(applicationId, "attachment");
    triggerBlobDownload(blob, "application_summary.pdf");
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-[#e7e0d5] bg-white shadow-sm transition hover:border-[#c9c0b3]">
      <button
        type="button"
        onClick={onPreview}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#faf8f4] text-left"
      >
        <PdfPlaceholder label="Résumé du dossier" />
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-2 pb-2 pt-8 text-xs font-medium text-white">
          Résumé du dossier
        </span>
      </button>
      <div className="flex items-center justify-between gap-2 px-2.5 py-2">
        <p className="text-[11px] text-[#78716c]">application_summary.pdf</p>
        <button
          type="button"
          onClick={onDownload}
          className="shrink-0 text-[11px] font-medium text-[#3d5a45] underline-offset-2 hover:underline"
        >
          Télécharger
        </button>
      </div>
    </article>
  );
}

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
  const contentType =
    target.kind === "member" ? target.document.content_type : target.contentType;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob =
          target.kind === "member"
            ? await fetchMemberDocumentBlob(applicationId, target.document.id, "inline")
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
  }, [applicationId, target]);

  const onDownload = useCallback(async () => {
    try {
      const blob =
        target.kind === "member"
          ? await fetchMemberDocumentBlob(applicationId, target.document.id, "attachment")
          : await fetchSummaryPdfBlob(applicationId, "attachment");
      triggerBlobDownload(blob, filename);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du téléchargement");
    }
  }, [applicationId, filename, target]);

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
            <p className="text-sm text-[#b91c1c]">{error}</p>
          ) : blobUrl && isImageContentType(contentType) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={blobUrl}
              alt={target.title}
              className="max-h-[75vh] max-w-full rounded shadow-sm"
            />
          ) : blobUrl && isPdfContentType(contentType) ? (
            <iframe
              src={blobUrl}
              title={target.title}
              className="h-[75vh] w-full rounded border border-[#e7e0d5] bg-white"
            />
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
  memberRoleLabel,
  memberDisplayName,
}: ApplicationDocumentsProps) {
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  const membersWithDocs = members.filter((member) => (member.documents?.length ?? 0) > 0);
  const hasAnything = summaryPdfAvailable || membersWithDocs.length > 0;

  if (!hasAnything) {
    return (
      <p className="mt-2 text-sm text-[#78716c]">Aucun document téléversé pour cette demande.</p>
    );
  }

  return (
    <>
      {summaryPdfAvailable && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-[#57534e]">Dossier</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <SummaryThumbnail
              applicationId={applicationId}
              onPreview={() =>
                setPreview({
                  kind: "summary",
                  title: "Résumé du dossier",
                  filename: "application_summary.pdf",
                  contentType: "application/pdf",
                })
              }
            />
          </div>
        </div>
      )}

      {membersWithDocs.map((member) => (
        <div key={member.id} className="mt-6">
          <h3 className="text-sm font-medium text-[#57534e]">
            {memberRoleLabel(member.role)} — {memberDisplayName(member)}
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {(member.documents ?? []).map((document) => {
              const label = documentTypeLabel(document.document_type);
              return (
                <DocumentThumbnail
                  key={document.id}
                  applicationId={applicationId}
                  document={document}
                  label={label}
                  onPreview={() =>
                    setPreview({
                      kind: "member",
                      document,
                      title: label,
                    })
                  }
                />
              );
            })}
          </div>
        </div>
      ))}

      {preview && (
        <DocumentPreviewModal
          applicationId={applicationId}
          target={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
