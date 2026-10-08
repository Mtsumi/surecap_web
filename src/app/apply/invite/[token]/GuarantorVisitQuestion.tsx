"use client";

import { useEffect, useRef, useState } from "react";
import IdCameraCapture from "../../IdCameraCapture";
import { uploadInviteDocument } from "@/lib/api";
import { ACCEPTED_ID_UPLOAD_TYPES } from "@/lib/documentUpload";
import { t, type Locale } from "@/lib/i18n";
import { formatClientFetchError } from "@/lib/clientFetchError";

export default function GuarantorVisitQuestion({
  locale,
  inviteToken,
  idReady,
  visited,
  selfieUploaded,
  onVisited,
  onSelfieUploaded,
}: {
  locale: Locale;
  inviteToken: string;
  idReady: boolean;
  visited: boolean | null;
  selfieUploaded: boolean;
  onVisited: (value: boolean) => void;
  onSelfieUploaded: (uploaded: boolean) => void;
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (visited !== false) setShowCamera(false);
  }, [visited]);

  async function send(file: File) {
    if (!idReady) {
      setError(t(locale, "guarantorSelfieNeedId"));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await uploadInviteDocument(inviteToken, "selfie", file);
      onSelfieUploaded(true);
    } catch (err: unknown) {
      setError(formatClientFetchError(err, locale, t(locale, "error")));
    } finally {
      setSending(false);
    }
  }

  if (showCamera) {
    return (
      <IdCameraCapture
        locale={locale}
        facingMode="user"
        frame="selfie"
        titleKey="selfieCameraTitle"
        alignHintKey="selfieCameraAlignHint"
        onCapture={(captured) => {
          setShowCamera(false);
          void send(captured);
        }}
        onCancel={() => setShowCamera(false)}
        onUseDeviceCamera={() => {
          setShowCamera(false);
          window.setTimeout(() => galleryRef.current?.click(), 0);
        }}
      />
    );
  }

  return (
    <fieldset className="space-y-3 rounded border border-[#e7e0d5] bg-[#faf8f4] p-3">
      <legend className="px-1 text-sm font-medium text-[#292524]">
        {t(locale, "guarantorVisitQuestion")}
      </legend>
      <p className="text-sm text-[#57534e]">{t(locale, "guarantorVisitHint")}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={`rounded border px-4 py-2 text-sm ${
            visited === true
              ? "border-[#3d5a45] bg-[#3d5a45] text-white"
              : "border-[#d6d3d1] bg-white text-[#292524]"
          }`}
          onClick={() => onVisited(true)}
        >
          {t(locale, "guarantorVisitYes")}
        </button>
        <button
          type="button"
          className={`rounded border px-4 py-2 text-sm ${
            visited === false
              ? "border-[#3d5a45] bg-[#3d5a45] text-white"
              : "border-[#d6d3d1] bg-white text-[#292524]"
          }`}
          onClick={() => onVisited(false)}
        >
          {t(locale, "guarantorVisitNo")}
        </button>
      </div>
      {visited === false ? (
        <div className="space-y-2">
          <p className="text-sm text-[#57534e]">{t(locale, "guarantorSelfieIntro")}</p>
          {!idReady ? (
            <p className="text-sm text-[#b91c1c]">{t(locale, "guarantorSelfieNeedId")}</p>
          ) : null}
          <input
            ref={galleryRef}
            type="file"
            accept={ACCEPTED_ID_UPLOAD_TYPES}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void send(file);
              event.target.value = "";
            }}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={sending || !idReady}
              className="rounded bg-[#3d5a45] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              onClick={() => setShowCamera(true)}
            >
              {sending ? t(locale, "guarantorSelfieSending") : t(locale, "guarantorSelfieTake")}
            </button>
            <button
              type="button"
              disabled={sending || !idReady}
              className="rounded border border-[#d6d3d1] bg-white px-4 py-2 text-sm text-[#292524] disabled:opacity-50"
              onClick={() => galleryRef.current?.click()}
            >
              {t(locale, "guarantorSelfieChoose")}
            </button>
          </div>
          {selfieUploaded ? (
            <p className="text-sm text-[#3d5a45]">{t(locale, "guarantorSelfieSaved")}</p>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="text-sm text-[#b91c1c]">{error}</p> : null}
    </fieldset>
  );
}
