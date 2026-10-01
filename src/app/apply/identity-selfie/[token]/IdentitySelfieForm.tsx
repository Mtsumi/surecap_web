"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  fetchIdentitySelfieContext,
  IdentitySelfieContext,
  uploadIdentitySelfie,
} from "@/lib/api";
import { ACCEPTED_ID_UPLOAD_TYPES } from "@/lib/documentUpload";

export default function IdentitySelfieForm({ token }: { token: string }) {
  const [ctx, setCtx] = useState<IdentitySelfieContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
          setError(err instanceof Error ? err.message : "Lien invalide ou expiré");
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

  const locale = ctx?.locale === "en" ? "en" : "fr";
  const copy =
    locale === "en"
      ? {
          title: "Verify your identity",
          intro:
            "Take a clear selfie so we can match it to the ID you already uploaded. This photo is used only for identity verification for your Montreal Living application.",
          take: "Take selfie",
          choose: "Choose photo",
          submit: "Send selfie",
          done: "Thank you — your selfie was received. Our team will continue reviewing your application.",
          closed: "This application is closed. Selfie upload is no longer available.",
          loading: "Loading…",
        }
      : {
          title: "Vérifiez votre identité",
          intro:
            "Prenez un selfie clair pour le comparer à la pièce d'identité déjà téléversée. Cette photo sert uniquement à la vérification d'identité pour votre demande Montreal Living.",
          take: "Prendre un selfie",
          choose: "Choisir une photo",
          submit: "Envoyer le selfie",
          done: "Merci — votre selfie a bien été reçu. Notre équipe poursuivra l'étude de votre demande.",
          closed: "Cette demande est fermée. L'envoi du selfie n'est plus disponible.",
          loading: "Chargement…",
        };

  function onPick(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError(locale === "en" ? "Please take or choose a photo." : "Prenez ou choisissez une photo.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await uploadIdentitySelfie(token, file);
      setCtx(updated);
      onPick(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--ml-steel)]">{copy.loading}</p>;
  }

  if (error && !ctx) {
    return <p className="text-sm text-[#7f1d1d]">{error}</p>;
  }

  if (!ctx) return null;

  if (ctx.application_closed) {
    return <p className="text-sm text-[var(--ml-ink)]">{copy.closed}</p>;
  }

  if (ctx.selfie_uploaded) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--ml-ink)]">{copy.title}</h1>
        <p className="text-sm text-[var(--ml-ink)]">{copy.done}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--ml-ink)]">{copy.title}</h1>
        <p className="mt-2 text-sm text-[var(--ml-steel)]">
          {ctx.member_name} — {copy.intro}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_ID_UPLOAD_TYPES}
        capture="user"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="rounded bg-[var(--ml-forest)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={submitting}
          onClick={() => inputRef.current?.click()}
        >
          {copy.take}
        </button>
        <button
          type="button"
          className="rounded border border-[var(--ml-line)] px-4 py-2 text-sm text-[var(--ml-ink)] disabled:opacity-50"
          disabled={submitting}
          onClick={() => {
            if (!inputRef.current) return;
            inputRef.current.removeAttribute("capture");
            inputRef.current.click();
            inputRef.current.setAttribute("capture", "user");
          }}
        >
          {copy.choose}
        </button>
      </div>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Selfie preview"
          className="max-h-80 w-full rounded border border-[var(--ml-line)] object-contain bg-white"
        />
      ) : null}
      {error ? <p className="text-sm text-[#7f1d1d]">{error}</p> : null}
      <button
        type="submit"
        disabled={!file || submitting}
        className="rounded bg-[var(--ml-forest)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {copy.submit}
      </button>
    </form>
  );
}
