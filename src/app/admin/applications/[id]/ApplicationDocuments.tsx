"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApplicationDetail, ApplicationMember } from "@/lib/adminApi";
import {
  regenerateApplicationSummary,
  requestAdminCreditSignature,
  uploadAdminMemberDocument,
} from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import {
  JANITOR_REVIEW_UPLOAD_TYPES,
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
import { ACCEPTED_UPLOAD_TYPES } from "@/lib/documentUpload";
import {
  uploadQualityBanner,
  uploadQualityTone,
} from "@/lib/uploadQuality";
import { useAdminCopy } from "../../AdminLocaleContext";

export type DocumentReviewRequest = {
  memberId: number;
  documentTypes: string[];
  nonce: number;
};

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
  docsEditable?: boolean;
  summaryPdfAvailable: boolean;
  dropboxDossierReady: boolean;
  memberRoleLabel: (role: string) => string;
  memberDisplayName: (member: ApplicationMember) => string;
  onSummaryRegenerated?: () => void;
  onApplicationUpdated?: (app: ApplicationDetail) => void;
  reviewRequest?: DocumentReviewRequest | null;
  /** Fired after a member document preview loads (e.g. ID viewed for identity gate). */
  onMemberDocumentPreviewed?: (document: MemberDocument) => void;
};

function DocumentPreviewModal({
  applicationId,
  target,
  onClose,
  onPrev,
  onNext,
  positionLabel,
  onMemberDocumentPreviewed,
}: {
  applicationId: number;
  target: PreviewTarget;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  positionLabel?: string | null;
  onMemberDocumentPreviewed?: (document: MemberDocument) => void;
}) {
  const { locale } = useAdminCopy();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const onPreviewedRef = useRef(onMemberDocumentPreviewed);
  onPreviewedRef.current = onMemberDocumentPreviewed;
  const notifiedDocIdRef = useRef<number | null>(null);

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
  const memberDocumentId =
    target.kind === "member" ? target.document.id : null;

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
        if (
          target.kind === "member" &&
          notifiedDocIdRef.current !== target.document.id
        ) {
          notifiedDocIdRef.current = target.document.id;
          onPreviewedRef.current?.(target.document);
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            formatAdminFetchError(
              e,
              locale,
              locale === "fr"
                ? "Impossible d'ouvrir le fichier"
                : "Could not open the file"
            )
          );
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
  }, [applicationId, fallbackContentType, locale, memberDocumentId, target]);

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
      setError(
        formatAdminFetchError(
          e,
          locale,
          locale === "fr" ? "Échec du téléchargement" : "Download failed"
        )
      );
    }
  }, [applicationId, fallbackContentType, filename, locale, target]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev?.();
      if (event.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onNext, onPrev]);

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
            <p className="truncate text-xs text-[var(--ml-steel)]">
              {positionLabel ? `${positionLabel} · ${filename}` : filename}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onPrev ? (
              <button
                type="button"
                onClick={onPrev}
                className={adminUi.btnSecondary + " !px-3 !py-1.5 !text-xs"}
              >
                ←
              </button>
            ) : null}
            {onNext ? (
              <button
                type="button"
                onClick={onNext}
                className={adminUi.btnSecondary + " !px-3 !py-1.5 !text-xs"}
              >
                →
              </button>
            ) : null}
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
  docsEditable = false,
  summaryPdfAvailable,
  dropboxDossierReady,
  memberRoleLabel,
  memberDisplayName,
  onSummaryRegenerated,
  onApplicationUpdated,
  reviewRequest,
  onMemberDocumentPreviewed,
}: ApplicationDocumentsProps) {
  const { locale, t } = useAdminCopy();
  const [previewQueue, setPreviewQueue] = useState<PreviewTarget[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const preview = previewQueue[previewIndex] ?? null;
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);
  const [opsMemberId, setOpsMemberId] = useState<number | null>(
    members[0]?.id ?? null
  );
  const [opsDocType, setOpsDocType] = useState(JANITOR_REVIEW_UPLOAD_TYPES[0]);
  const [opsFiles, setOpsFiles] = useState<File[]>([]);
  const [opsFileInputKey, setOpsFileInputKey] = useState(0);
  const [opsBusy, setOpsBusy] = useState<"upload" | "sign" | null>(null);
  const [opsQualityBanner, setOpsQualityBanner] = useState<string | null>(null);
  const [opsQualityTone, setOpsQualityTone] = useState<"warn" | "fail" | null>(
    null
  );

  const membersWithDocs = members.filter((member) => (member.documents?.length ?? 0) > 0);
  const hasMemberDocs = membersWithDocs.length > 0;
  const activeOpsMember =
    members.find((m) => m.id === opsMemberId) ?? members[0] ?? null;

  useEffect(() => {
    if (!opsMemberId && members[0]) setOpsMemberId(members[0].id);
  }, [members, opsMemberId]);

  async function uploadOpsFiles() {
    if (!activeOpsMember || opsFiles.length === 0 || !docsEditable) return;
    setOpsBusy("upload");
    setError(null);
    setOpsQualityBanner(null);
    setOpsQualityTone(null);
    let lastApp: ApplicationDetail | null = null;
    try {
      for (const file of opsFiles) {
        const result = await uploadAdminMemberDocument(
          applicationId,
          activeOpsMember.id,
          opsDocType,
          file
        );
        lastApp = result.application;
        const banner = uploadQualityBanner(result.quality, locale);
        const tone = uploadQualityTone(result.quality);
        if (banner) {
          setOpsQualityBanner(banner);
          setOpsQualityTone(tone);
        }
      }
      if (lastApp) onApplicationUpdated?.(lastApp);
      setOpsFiles([]);
      setOpsFileInputKey((k) => k + 1);
    } catch (e) {
      setError(
        formatAdminFetchError(e, locale, t("reviewDocsUploadFail"))
      );
    } finally {
      setOpsBusy(null);
    }
  }

  async function askOpsSign() {
    if (!activeOpsMember || !docsEditable) return;
    if (!activeOpsMember.email) {
      setError(t("reviewAskSignNoEmail"));
      return;
    }
    setOpsBusy("sign");
    setError(null);
    try {
      const updated = await requestAdminCreditSignature(
        applicationId,
        activeOpsMember.id,
        locale === "en" ? "en" : "fr"
      );
      onApplicationUpdated?.(updated);
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("reviewAskSignFail")));
    } finally {
      setOpsBusy(null);
    }
  }

  useEffect(() => {
    if (!reviewRequest) return;
    const member = members.find((item) => item.id === reviewRequest.memberId);
    const docs = (member?.documents ?? []).filter((doc) =>
      reviewRequest.documentTypes.includes(doc.document_type)
    );
    if (docs.length === 0) {
      document.getElementById("documents-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setPreviewQueue(
      docs.map((document) => ({
        kind: "member" as const,
        document,
        title: documentTypeLabel(document.document_type),
      }))
    );
    setPreviewIndex(0);
    // Only when a new reviewRequest is issued (nonce), not when members refresh after Met/Not-met.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: members listed for read at request time
  }, [reviewRequest]);

  if (
    !summaryPdfAvailable &&
    !hasMemberDocs &&
    !dropboxDossierReady &&
    !docsEditable
  ) {
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
      setError(
        formatAdminFetchError(
          e,
          locale,
          locale === "fr" ? "Échec du téléchargement" : "Download failed"
        )
      );
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
      setError(
        formatAdminFetchError(
          e,
          locale,
          locale === "fr" ? "Échec du téléchargement" : "Download failed"
        )
      );
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
      setError(
        formatAdminFetchError(
          e,
          locale,
          locale === "fr"
            ? "Échec de la génération du résumé"
            : "Could not regenerate the summary"
        )
      );
    } finally {
      setRegeneratingSummary(false);
    }
  };

  const consentSigned = Boolean(activeOpsMember?.credit_consent_signed);
  const signaturePending = Boolean(
    activeOpsMember?.credit_consent_signature_pending
  );

  return (
    <>
      <p className="text-xs text-[var(--ml-steel)]">
        Les fichiers sont chargés depuis Dropbox à la demande (aperçu ou téléchargement).
      </p>

      {error ? <p className={`${adminUi.alertError} mt-3`}>{error}</p> : null}

      {docsEditable && members.length > 0 ? (
        <div className="mt-4 space-y-3 rounded border border-[var(--ml-line)] bg-white p-3">
          <p className="text-sm font-medium text-[var(--ml-ink)]">
            {t("reviewDocsTitle")}
          </p>
          <label className="block text-xs font-medium text-[var(--ml-steel)]">
            {locale === "fr" ? "Membre" : "Member"}
            <select
              className="mt-1 w-full rounded border border-[var(--ml-line)] px-2 py-1.5 text-sm text-[var(--ml-ink)]"
              value={activeOpsMember?.id ?? ""}
              disabled={Boolean(opsBusy)}
              onChange={(e) => setOpsMemberId(Number(e.target.value))}
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {memberRoleLabel(m.role)} — {memberDisplayName(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--ml-steel)]">
            {t("reviewDocsType")}
            <select
              className="mt-1 w-full rounded border border-[var(--ml-line)] px-2 py-1.5 text-sm text-[var(--ml-ink)]"
              value={opsDocType}
              disabled={Boolean(opsBusy)}
              onChange={(e) => setOpsDocType(e.target.value)}
            >
              {JANITOR_REVIEW_UPLOAD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {documentTypeLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-medium text-[var(--ml-steel)]">
            {t("reviewDocsFile")}
            <input
              key={opsFileInputKey}
              type="file"
              multiple
              accept={ACCEPTED_UPLOAD_TYPES}
              className="mt-1 block w-full text-sm"
              disabled={Boolean(opsBusy)}
              onChange={(e) =>
                setOpsFiles(Array.from(e.target.files ?? []))
              }
            />
          </label>
          {opsFiles.length > 0 ? (
            <p className="text-xs text-[var(--ml-steel)]">
              {opsFiles.length} fichier{opsFiles.length === 1 ? "" : "s"}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminUi.btnSecondary}
              disabled={opsFiles.length === 0 || Boolean(opsBusy)}
              onClick={() => void uploadOpsFiles()}
            >
              {opsBusy === "upload"
                ? t("reviewDocsUploading")
                : t("reviewDocsUpload")}
            </button>
            {!consentSigned ? (
              <button
                type="button"
                className={adminUi.btnSecondary}
                disabled={Boolean(opsBusy) || signaturePending}
                onClick={() => void askOpsSign()}
              >
                {opsBusy === "sign"
                  ? t("reviewAskSignSending")
                  : signaturePending
                    ? t("reviewAskSignSent")
                    : t("reviewAskSign")}
              </button>
            ) : (
              <span className="self-center text-xs text-[var(--ml-steel)]">
                {t("reviewCreditConsent")}
              </span>
            )}
          </div>
          {opsQualityBanner ? (
            <p
              className={
                opsQualityTone === "fail"
                  ? "text-sm text-[#7f1d1d]"
                  : "text-sm text-[#92400e]"
              }
              role="status"
            >
              {opsQualityBanner}
            </p>
          ) : null}
        </div>
      ) : null}

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

      {summaryPdfAvailable || hasMemberDocs ? (
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
                      onClick={() => {
                        setPreviewQueue([
                          {
                            kind: "summary",
                            title: "Résumé du dossier",
                            filename: "application_summary.pdf",
                            contentType: "application/pdf",
                          },
                        ]);
                        setPreviewIndex(0);
                      }}
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
              const memberLabel = `${memberRoleLabel(member.role)} - ${memberDisplayName(member)}`;
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
                          onClick={() => {
                            setPreviewQueue([
                              {
                                kind: "member",
                                document,
                                title: label,
                              },
                            ]);
                            setPreviewIndex(0);
                          }}
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
      ) : null}

      {!summaryPdfAvailable && !hasMemberDocs && dropboxDossierReady ? (
        <p className={`${adminUi.empty} mt-4`}>Aucun document membre pour cette demande.</p>
      ) : null}

      {preview ? (
        <DocumentPreviewModal
          applicationId={applicationId}
          target={preview}
          onMemberDocumentPreviewed={onMemberDocumentPreviewed}
          onClose={() => {
            setPreviewQueue([]);
            setPreviewIndex(0);
          }}
          onPrev={
            previewQueue.length > 1 && previewIndex > 0
              ? () => setPreviewIndex((index) => index - 1)
              : undefined
          }
          onNext={
            previewQueue.length > 1 && previewIndex < previewQueue.length - 1
              ? () => setPreviewIndex((index) => index + 1)
              : undefined
          }
          positionLabel={
            previewQueue.length > 1
              ? `${previewIndex + 1} / ${previewQueue.length}`
              : null
          }
        />
      ) : null}
    </>
  );
}
