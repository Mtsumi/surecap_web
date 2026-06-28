"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACCEPTED_UPLOAD_TYPES,
  ID_DOCUMENT_SLOTS,
  IdDocumentKind,
} from "@/lib/documentUpload";
import {
  MemberDocument,
  listMemberDocuments,
  uploadMemberDocument,
} from "@/lib/api";
import { Locale, MessageKey, t } from "@/lib/i18n";

const SLOT_LABEL: Record<string, MessageKey> = {
  id_passport: "idPassport",
  id_medicare: "idMedicare",
  id_driver_licence_front: "idDriverLicenceFront",
  id_driver_licence_back: "idDriverLicenceBack",
};

type Props = {
  locale: Locale;
  applicationId: number;
  memberId: number;
  uploadToken: string;
};

export default function PostSubmitDocuments({
  locale,
  applicationId,
  memberId,
  uploadToken,
}: Props) {
  const [idKind, setIdKind] = useState<IdDocumentKind>("passport");
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listMemberDocuments(applicationId, memberId, uploadToken);
      setDocuments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
    } finally {
      setLoadingList(false);
    }
  }, [applicationId, memberId, locale, uploadToken]);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  const uploadedTypes = new Set(documents.map((doc) => doc.document_type));

  const handleFile = async (documentType: string, file: File | null) => {
    if (!file) return;
    setError(null);
    setLastSuccess(null);
    setUploadingSlot(documentType);
    try {
      const saved = await uploadMemberDocument(
        applicationId,
        memberId,
        uploadToken,
        documentType,
        file
      );
      setDocuments((prev) => {
        const rest = prev.filter((doc) => doc.document_type !== documentType);
        return [...rest, saved].sort((a, b) =>
          a.document_type.localeCompare(b.document_type)
        );
      });
      setLastSuccess(documentType);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
    } finally {
      setUploadingSlot(null);
    }
  };

  const slots = ID_DOCUMENT_SLOTS[idKind];

  return (
    <div className="mt-8 rounded border border-[#d4e4d6] bg-white px-5 py-6 text-left">
      <h3 className="text-base font-medium text-[#1a3d22]">
        {t(locale, "uploadDocumentsTitle")}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#57534e]">
        {t(locale, "uploadDocumentsHint")}
      </p>

      <label className="mt-5 block text-sm text-[#57534e]">
        {t(locale, "idDocumentType")}
        <select
          value={idKind}
          onChange={(e) => setIdKind(e.target.value as IdDocumentKind)}
          className="mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-base text-[#292524] outline-none focus:border-[#3d5a45]"
        >
          <option value="passport">{t(locale, "idPassport")}</option>
          <option value="medicare">{t(locale, "idMedicare")}</option>
          <option value="driver_licence">{t(locale, "idDriverLicence")}</option>
        </select>
      </label>

      <div className="mt-4 space-y-4">
        {slots.map((slot) => {
          const labelKey = SLOT_LABEL[slot];
          const uploaded = documents.find((doc) => doc.document_type === slot);
          const busy = uploadingSlot === slot;
          return (
            <div key={slot} className="rounded border border-[#e7e0d5] px-4 py-3">
              <p className="text-sm font-medium text-[#292524]">
                {labelKey ? t(locale, labelKey) : slot}
              </p>
              {uploaded && (
                <p className="mt-1 text-xs text-[#3d5a45]">
                  {t(locale, "uploadSaved")}: {uploaded.original_filename}
                </p>
              )}
              <label className="mt-2 block">
                <span className="sr-only">{t(locale, "uploadChooseFile")}</span>
                <input
                  type="file"
                  accept={ACCEPTED_UPLOAD_TYPES}
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void handleFile(slot, file);
                    e.target.value = "";
                  }}
                  className="block w-full text-sm text-[#57534e] file:mr-3 file:rounded file:border-0 file:bg-[#e8f0ea] file:px-3 file:py-2 file:text-sm file:font-medium file:text-[#1a3d22] hover:file:bg-[#d4e4d6] disabled:opacity-60"
                />
              </label>
              {busy && (
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

      {lastSuccess && !error && (
        <p className="mt-4 text-sm text-[#3d5a45]">{t(locale, "uploadSuccess")}</p>
      )}

      {!loadingList && documents.length > 0 && (
        <div className="mt-5 border-t border-[#e7e0d5] pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#a8a29e]">
            {t(locale, "uploadedFiles")}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-[#44403c]">
            {documents.map((doc) => (
              <li key={doc.id}>
                {doc.original_filename}{" "}
                <span className="text-[#a8a29e]">({doc.document_type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {idKind === "driver_licence" &&
        slots.every((slot) => uploadedTypes.has(slot)) && (
          <p className="mt-4 text-sm text-[#3d5a45]">{t(locale, "idUploadComplete")}</p>
        )}
    </div>
  );
}
