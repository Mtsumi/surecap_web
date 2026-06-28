"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ACCEPTED_UPLOAD_TYPES,
  ID_DOCUMENT_SLOTS,
  IdDocumentKind,
  idSlotsForKind,
  staleIdDocumentTypes,
} from "@/lib/documentUpload";
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

export default function StepDocumentUpload(props: Props) {
  const { locale, idKind, onIdKindChange, onDocumentsChange } = props;
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publishDocuments = useCallback(
    (next: MemberDocument[]) => {
      setDocuments(next);
      onDocumentsChange?.(next);
    },
    [onDocumentsChange]
  );

  const refreshDocuments = useCallback(async () => {
    setLoadingList(true);
    try {
      const list =
        props.mode === "member"
          ? await listMemberDocuments(
              props.applicationId,
              props.memberId,
              props.uploadToken
            )
          : await listInviteDocuments(props.inviteToken);
      publishDocuments(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
    } finally {
      setLoadingList(false);
    }
  }, [props, locale, publishDocuments]);

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
      publishDocuments(documents.filter((doc) => doc.document_type !== documentType));
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
      const saved =
        props.mode === "member"
          ? await uploadMemberDocument(
              props.applicationId,
              props.memberId,
              props.uploadToken,
              documentType,
              file
            )
          : await uploadInviteDocument(props.inviteToken, documentType, file);
      publishDocuments(
        [...documents.filter((doc) => doc.document_type !== documentType), saved].sort(
          (a, b) => a.document_type.localeCompare(b.document_type)
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "uploadFailed"));
    } finally {
      setBusySlot(null);
    }
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
        publishDocuments(
          documents.filter((doc) => !stale.includes(doc.document_type))
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
  const uploadedTypes = new Set(documents.map((doc) => doc.document_type));
  const switchingKind = busySlot === "id_kind";

  return (
    <div className="rounded border border-[#d4e4d6] bg-[#fafcfa] px-4 py-5">
      <h3 className="text-sm font-medium text-[#1a3d22]">
        {t(locale, "uploadDocumentsTitle")}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-[#57534e]">
        {t(locale, "uploadDocumentsHint")}
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
          <option value="passport">{t(locale, "idPassport")}</option>
          <option value="medicare">{t(locale, "idMedicare")}</option>
          <option value="driver_licence">{t(locale, "idDriverLicence")}</option>
        </select>
      </label>

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
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label>
                  <span className="sr-only">
                    {uploaded ? t(locale, "uploadReplaceFile") : t(locale, "uploadChooseFile")}
                  </span>
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
    </div>
  );
}
