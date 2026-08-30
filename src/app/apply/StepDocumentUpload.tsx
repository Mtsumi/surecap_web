"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCEPTED_ID_UPLOAD_TYPES,
  ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF,
  ID_DOCUMENT_SLOTS,
  IdDocumentKind,
  idSlotsForKind,
  staleIdDocumentTypes,
} from "@/lib/documentUpload";
import { compressImageForUpload } from "@/lib/compressImage";
import {
  MemberDocument,
  deleteInviteDocument,
  deleteMemberDocument,
  listInviteDocuments,
  listMemberDocuments,
  uploadInviteDocument,
  uploadMemberDocument,
} from "@/lib/api";
import { Locale, MessageKey, t } from "@/lib/i18n";
import { normalizeUploadFile } from "@/lib/normalizeUploadFile";
import {
  uploadQualityBanner,
  uploadQualityTone,
  qualityBySlotFromDocuments,
  mergeMemberDocument,
  removeMemberDocumentType,
  UploadQuality,
} from "@/lib/uploadQuality";
import IdCameraCapture from "./IdCameraCapture";

const SLOT_LABEL: Record<string, MessageKey> = {
  id_passport: "idPassport",
  id_medicare: "idMedicare",
  id_driver_licence_front: "idDriverLicenceFront",
  id_driver_licence_back: "idDriverLicenceBack",
};

type MemberMode = {
  mode: "member";
  applicationId: number;
  memberId: number;
  uploadToken: string;
};

type InviteMode = {
  mode: "invite";
  inviteToken: string;
};

type Props = (MemberMode | InviteMode) & {
  locale: Locale;
  idKind: IdDocumentKind;
  onIdKindChange: (kind: IdDocumentKind) => void;
  onDocumentsChange?: (documents: MemberDocument[]) => void;
};

function documentsEqual(a: MemberDocument[], b: MemberDocument[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (doc, index) =>
      doc.id === b[index]?.id && doc.document_type === b[index]?.document_type
  );
}

export default function StepDocumentUpload(props: Props) {
  const { locale, idKind, onIdKindChange, onDocumentsChange } = props;
  const isMember = props.mode === "member";
  const applicationId = isMember ? props.applicationId : 0;
  const memberId = isMember ? props.memberId : 0;
  const uploadToken = isMember ? props.uploadToken : "";
  const inviteToken = props.mode === "invite" ? props.inviteToken : "";

  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [qualityBySlot, setQualityBySlot] = useState<Record<string, UploadQuality>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraSlot, setCameraSlot] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const fileBrowseRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const onDocumentsChangeRef = useRef(onDocumentsChange);
  onDocumentsChangeRef.current = onDocumentsChange;

  const publishDocuments = useCallback((next: MemberDocument[]) => {
    setQualityBySlot(qualityBySlotFromDocuments(next));
    setDocuments((prev) => {
      if (documentsEqual(prev, next)) return prev;
      onDocumentsChangeRef.current?.(next);
      return next;
    });
  }, []);

  const applyDocumentUpdate = useCallback(
    (updater: (prev: MemberDocument[]) => MemberDocument[]) => {
      setDocuments((prev) => {
        const next = updater(prev);
        setQualityBySlot(qualityBySlotFromDocuments(next));
        if (documentsEqual(prev, next)) return prev;
        onDocumentsChangeRef.current?.(next);
        return next;
      });
    },
    []
  );

  const refreshDocuments = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = isMember
        ? await listMemberDocuments(applicationId, memberId, uploadToken)
        : await listInviteDocuments(inviteToken);
      publishDocuments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
    } finally {
      setLoadingList(false);
    }
  }, [
    isMember,
    applicationId,
    memberId,
    uploadToken,
    inviteToken,
    locale,
    publishDocuments,
  ]);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const removeDocument = async (documentType: string) => {
    setError(null);
    setBusySlot(documentType);
    try {
      if (props.mode === "member") {
        await deleteMemberDocument(
          props.applicationId,
          props.memberId,
          props.uploadToken,
          documentType
        );
      } else {
        await deleteInviteDocument(props.inviteToken, documentType);
      }
      applyDocumentUpdate((prev) => removeMemberDocumentType(prev, documentType));
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
    } finally {
      setBusySlot(null);
    }
  };

  const handleFile = async (documentType: string, file: File | null) => {
    if (!file) return;
    setError(null);
    setBusySlot(documentType);
    try {
      // Normalize first — Android may report empty/octet-stream for JPEGs.
      const normalized = await normalizeUploadFile(file);
      const isPdf = normalized.type === "application/pdf";
      if (!normalized.type.startsWith("image/") && !isPdf) {
        setError(t(locale, "idUploadImageOnly"));
        return;
      }
      // compressImageForUpload returns PDFs unchanged; safe to call for both.
      const uploadFile = await compressImageForUpload(normalized);
      const uploadResult =
        props.mode === "member"
          ? await uploadMemberDocument(
              props.applicationId,
              props.memberId,
              props.uploadToken,
              documentType,
              uploadFile
            )
          : await uploadInviteDocument(props.inviteToken, documentType, uploadFile);
      const saved: MemberDocument = {
        ...uploadResult.document,
        quality_level: uploadResult.quality.level,
        quality_flags: uploadResult.quality.flags,
        quality_message: uploadResult.quality.message ?? null,
        upload_generation: uploadResult.quality.upload_generation,
      };
      applyDocumentUpdate((prev) => mergeMemberDocument(prev, saved));
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
    } finally {
      setBusySlot(null);
    }
  };

  const openDeviceCamera = (documentType: string) => {
    fileInputRefs.current[documentType]?.click();
  };

  const openGuidedCamera = (documentType: string) => {
    setError(null);
    setCameraSlot(documentType);
  };

  const handleIdKindChange = async (nextKind: IdDocumentKind) => {
    if (nextKind === idKind) return;
    const stale = staleIdDocumentTypes(
      nextKind,
      documents.map((doc) => doc.document_type)
    );
    if (stale.length > 0) {
      setBusySlot("id_kind");
      setError(null);
      try {
        for (const documentType of stale) {
          if (props.mode === "member") {
            await deleteMemberDocument(
              props.applicationId,
              props.memberId,
              props.uploadToken,
              documentType
            );
          } else {
            await deleteInviteDocument(props.inviteToken, documentType);
          }
        }
        applyDocumentUpdate((prev) =>
          prev.filter((doc) => !stale.includes(doc.document_type))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
        setBusySlot(null);
        return;
      }
      setBusySlot(null);
    }
    onIdKindChange(nextKind);
  };

  const slots = idSlotsForKind(idKind);
  const switchingKind = busySlot === "id_kind";
  const uploadedTypes = new Set(documents.map((doc) => doc.document_type));

  return (
    <div className="rounded border border-[#d4e4d6] bg-[#fafcfa] px-4 py-5">
      <h3 className="text-sm font-medium text-[#292524]">
        {t(locale, "uploadDocumentsTitle")}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-[#57534e]">
        {t(locale, "uploadDocumentsHint")}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#78716c]">
        {t(locale, "idUploadLaterHint")}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[#78716c]">
        {t(locale, "idUploadCameraHint")}
      </p>

      <label className="mt-4 block text-sm text-[#57534e]">
        {t(locale, "idDocumentType")}
        <select
          value={idKind}
          disabled={switchingKind}
          onChange={(e) => {
            void handleIdKindChange(e.target.value as IdDocumentKind);
          }}
          className="mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-base text-[#292524] outline-none focus:border-[#3d5a45] disabled:opacity-60"
        >
          <option value="driver_licence">{t(locale, "idDriverLicence")}</option>
          <option value="medicare">{t(locale, "idMedicare")}</option>
          <option value="passport">{t(locale, "idPassport")}</option>
        </select>
      </label>
      {idKind === "driver_licence" && (
        <p className="mt-2 text-sm leading-relaxed text-[#78716c]">
          {t(locale, "idDriverLicenceHint")}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {slots.map((slot) => {
          const labelKey = SLOT_LABEL[slot];
          const uploaded = documents.find((doc) => doc.document_type === slot);
          const busy = busySlot === slot || switchingKind;
          return (
            <div key={slot} className="rounded border border-[#e7e0d5] bg-white px-4 py-3">
              <p className="text-sm font-medium text-[#292524]">
                {labelKey ? t(locale, labelKey) : slot}
              </p>
              {uploaded && (
                <p className="mt-1 text-xs text-[#3d5a45]">
                  {t(locale, "uploadSaved")}: {uploaded.original_filename}
                </p>
              )}
              {qualityBySlot[slot] && (
                <p
                  className={`mt-2 rounded px-3 py-2 text-xs leading-relaxed ${
                    uploadQualityTone(qualityBySlot[slot]) === "fail"
                      ? "border border-[#e7c4c4] bg-[#fdf5f5] text-[#7f1d1d]"
                      : "border border-[#f5e6c8] bg-[#fffbeb] text-[#92400e]"
                  }`}
                >
                  {uploadQualityBanner(qualityBySlot[slot], locale)}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {/* Camera input — opens device camera directly on mobile */}
                <input
                  ref={(el) => {
                    fileInputRefs.current[slot] = el;
                  }}
                  type="file"
                  accept={ACCEPTED_ID_UPLOAD_TYPES}
                  capture="environment"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleFile(slot, file);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
                {/* Browse input — file picker without capture, accepts images + PDFs */}
                <input
                  ref={(el) => {
                    fileBrowseRefs.current[slot] = el;
                  }}
                  type="file"
                  accept={ACCEPTED_ID_UPLOAD_TYPES_WITH_PDF}
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleFile(slot, file);
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => openGuidedCamera(slot)}
                  className="rounded border-0 bg-[#e8f0ea] px-3 py-2 text-sm font-medium text-[#1a3d22] transition hover:bg-[#d4e4d6] disabled:opacity-60"
                >
                  {uploaded ? t(locale, "idRetakePhoto") : t(locale, "idTakePhoto")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileBrowseRefs.current[slot]?.click()}
                  className="rounded border border-[#c8bfb0] bg-white px-3 py-2 text-sm font-medium text-[#3d3229] transition hover:bg-[#f5f0eb] disabled:opacity-60"
                >
                  {t(locale, "idBrowseFile")}
                </button>
                {uploaded && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeDocument(slot)}
                    className="text-sm text-[#7f1d1d] underline-offset-2 hover:underline disabled:opacity-60"
                  >
                    {t(locale, "uploadRemoveFile")}
                  </button>
                )}
              </div>
              {busy && busySlot === slot && (
                <p className="mt-1 text-xs text-[#78716c]">{t(locale, "loading")}</p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      {!loadingList &&
        idKind === "driver_licence" &&
        ID_DOCUMENT_SLOTS.driver_licence.every((slot) => uploadedTypes.has(slot)) && (
          <p className="mt-4 text-sm text-[#3d5a45]">{t(locale, "idUploadComplete")}</p>
        )}

      {cameraSlot ? (
        <IdCameraCapture
          locale={locale}
          onCancel={() => setCameraSlot(null)}
          onCapture={(file) => {
            const documentType = cameraSlot;
            setCameraSlot(null);
            void handleFile(documentType, file);
          }}
          onUseDeviceCamera={() => {
            const documentType = cameraSlot;
            setCameraSlot(null);
            requestAnimationFrame(() => openDeviceCamera(documentType));
          }}
        />
      ) : null}
    </div>
  );
}
