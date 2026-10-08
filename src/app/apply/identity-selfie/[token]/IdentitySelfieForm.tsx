"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  fetchIdentitySelfieContext,
  IdentitySelfieContext,
  uploadIdentitySelfie,
} from "@/lib/api";
import { ACCEPTED_ID_UPLOAD_TYPES } from "@/lib/documentUpload";
import IdCameraCapture from "@/app/apply/IdCameraCapture";
import type { Locale } from "@/lib/i18n";
import { formatClientFetchError } from "@/lib/clientFetchError";

export default function IdentitySelfieForm({ token }: { token: string }) {
  const [ctx, setCtx] = useState<IdentitySelfieContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIdentitySelfieContext(token)
      .then((data) => {
        if (!cancelled) {
          setCtx(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            formatClientFetchError(err, "fr", "Lien invalide ou expiré")
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const locale: Locale = ctx?.locale === "en" ? "en" : "fr";
  const copy =
    locale === "en"
      ? {
          title: "Verify your identity",
          intro:
            "Take a clear selfie so we can match it to the ID you already uploaded. This photo is used only for identity verification for your Montreal Living application.",
          take: "Take selfie",
          choose: "Choose from gallery",
          submit: "Send selfie",
          submitting: "Sending…",
          done: "Thank you - your selfie was received. Our team will continue reviewing your application.",
          closed: "This application is closed. Selfie upload is no longer available.",
          loading: "Loading…",
          needPhoto: "Please take or choose a photo.",
        }
      : {
          title: "Vérifiez votre identité",
          intro:
            "Prenez un selfie clair pour le comparer à la pièce d'identité déjà téléversée. Cette photo sert uniquement à la vérification d'identité pour votre demande Montreal Living.",
          take: "Prendre un selfie",
          choose: "Choisir dans la galerie",
          submit: "Envoyer le selfie",
          submitting: "Envoi…",
          done: "Merci - votre selfie a bien été reçu. Notre équipe poursuivra l'étude de votre demande.",
          closed: "Cette demande est fermée. L'envoi du selfie n'est plus disponible.",
          loading: "Chargement…",
          needPhoto: "Prenez ou choisissez une photo.",
        };

  function onPick(next: File | null) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return next ? URL.createObjectURL(next) : null;
    });
    setFile(next);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError(copy.needPhoto);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await uploadIdentitySelfie(token, file);
      setCtx(updated);
      onPick(null);
    } catch (err: unknown) {
      setError(formatClientFetchError(err, locale, locale === "en" ? "Upload failed" : "Échec de l'envoi"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[#78716c]">{copy.loading}</p>;
  }

  if (error && !ctx) {
    return <p className="text-sm text-[#7f1d1d]">{error}</p>;
  }

  if (!ctx) return null;

  if (ctx.application_closed) {
    return <p className="text-sm text-[#292524]">{copy.closed}</p>;
  }

  if (ctx.selfie_uploaded) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[#292524]">{copy.title}</h1>
        <p className="text-sm text-[#292524]">{copy.done}</p>
      </div>
    );
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
          onPick(captured);
          setShowCamera(false);
        }}
        onCancel={() => setShowCamera(false)}
        onUseDeviceCamera={() => {
          setShowCamera(false);
          window.setTimeout(() => galleryInputRef.current?.click(), 0);
        }}
      />
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#292524]">{copy.title}</h1>
        <p className="mt-2 text-sm text-[#57534e]">
          {ctx.member_name} - {copy.intro}
        </p>
      </div>
      <input
        ref={galleryInputRef}
        type="file"
        accept={ACCEPTED_ID_UPLOAD_TYPES}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          disabled={submitting}
          onClick={() => setShowCamera(true)}
        >
          {copy.take}
        </button>
        <button
          type="button"
          className="rounded border border-[#d6d3d1] bg-white px-4 py-2.5 text-sm font-medium text-[#292524] disabled:opacity-50"
          disabled={submitting}
          onClick={() => galleryInputRef.current?.click()}
        >
          {copy.choose}
        </button>
      </div>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Selfie preview"
          className={`max-h-80 w-full rounded border border-[#d6d3d1] object-contain bg-white ${
            submitting ? "opacity-60" : ""
          }`}
        />
      ) : null}
      {submitting ? (
        <p className="text-sm text-[#57534e]">{copy.submitting}</p>
      ) : null}
      {error ? <p className="text-sm text-[#7f1d1d]">{error}</p> : null}
      <button
        type="submit"
        disabled={!file || submitting}
        className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
