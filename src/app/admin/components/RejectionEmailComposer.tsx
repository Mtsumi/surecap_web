"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminUi } from "@/lib/adminUi";
import type { RejectionEmailDraft } from "@/lib/adminApi";

export type RejectionComposeValues = {
  reason: string;
  locale: "fr" | "en";
  email_subject: string;
  email_body: string;
};

type Props = {
  loadDraft: (opts: {
    locale?: "fr" | "en";
    reason: string;
  }) => Promise<RejectionEmailDraft>;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (values: RejectionComposeValues) => void | Promise<void>;
  initialReason?: string;
  title?: string;
};

export default function RejectionEmailComposer({
  loadDraft,
  submitting,
  onCancel,
  onConfirm,
  initialReason = "",
  title = "Courriel de refus au demandeur",
}: Props) {
  const [reason, setReason] = useState(initialReason);
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ccJanitor, setCcJanitor] = useState(false);
  const [janitorEmail, setJanitorEmail] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);

  const applyDraft = useCallback((draft: RejectionEmailDraft) => {
    setLocale(draft.locale);
    setSubject(draft.subject);
    setBody(draft.body);
    setCcJanitor(draft.cc_janitor);
    setJanitorEmail(draft.janitor_email);
  }, []);

  const refreshDraft = useCallback(
    async (nextLocale: "fr" | "en", nextReason: string) => {
      setLoadingDraft(true);
      setDraftError(null);
      try {
        const draft = await loadDraft({ locale: nextLocale, reason: nextReason });
        applyDraft(draft);
      } catch (e) {
        setDraftError(
          e instanceof Error ? e.message : "Impossible de charger le brouillon"
        );
      } finally {
        setLoadingDraft(false);
      }
    },
    [applyDraft, loadDraft]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDraft(true);
      setDraftError(null);
      try {
        const draft = await loadDraft({ reason: initialReason });
        if (!cancelled) applyDraft(draft);
      } catch (e) {
        if (!cancelled) {
          setDraftError(
            e instanceof Error ? e.message : "Impossible de charger le brouillon"
          );
        }
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyDraft, initialReason, loadDraft]);

  const onLocaleChange = async (next: "fr" | "en") => {
    setLocale(next);
    await refreshDraft(next, reason);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim() || !subject.trim()) return;
    void onConfirm({
      reason: reason.trim(),
      locale,
      email_subject: subject.trim(),
      email_body: body.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-[var(--ml-line)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--ml-ink)]">{title}</h3>
      <p className="text-xs text-[var(--ml-steel)]">
        Modifiez le courriel avant l&apos;envoi. Le concierge est en copie (CC)
        lorsqu&apos;une adresse est configurée
        {janitorEmail ? ` (${janitorEmail})` : ""}
        {ccJanitor ? "." : " — aucun CC pour ce dossier."}
      </p>

      <label className="block text-sm text-[var(--ml-steel)]">
        Motif (dossier + ligne Motif/Reason)
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={2}
          className={`${adminUi.textarea} mt-1`}
          placeholder="Ex. crédit insuffisant"
        />
      </label>
      <button
        type="button"
        disabled={loadingDraft || submitting}
        onClick={() => void refreshDraft(locale, reason)}
        className={`${adminUi.btnGhost} text-xs`}
      >
        Réinjecter le motif dans le brouillon
      </button>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[var(--ml-steel)]">Langue</span>
        <button
          type="button"
          disabled={loadingDraft || submitting}
          className={locale === "fr" ? adminUi.btnSecondary : adminUi.btnGhost}
          onClick={() => void onLocaleChange("fr")}
        >
          FR
        </button>
        <button
          type="button"
          disabled={loadingDraft || submitting}
          className={locale === "en" ? adminUi.btnSecondary : adminUi.btnGhost}
          onClick={() => void onLocaleChange("en")}
        >
          EN
        </button>
        <span className="text-xs text-[var(--ml-steel)]">
          (changer la langue recharge le modèle)
        </span>
      </div>

      {draftError ? <p className={adminUi.alertError}>{draftError}</p> : null}
      {loadingDraft ? (
        <p className="text-sm text-[var(--ml-steel)]">Chargement du brouillon…</p>
      ) : null}

      <label className="block text-sm text-[var(--ml-steel)]">
        Objet
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={`${adminUi.input} mt-1`}
          disabled={loadingDraft || submitting}
          required
        />
      </label>

      <label className="block text-sm text-[var(--ml-steel)]">
        Message
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className={`${adminUi.textarea} mt-1 font-mono text-sm`}
          disabled={loadingDraft || submitting}
          required
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={submitting || loadingDraft || !body.trim() || !subject.trim()}
          className={`${adminUi.btnDanger} disabled:opacity-50`}
        >
          Envoyer le refus
        </button>
        <button
          type="button"
          disabled={submitting}
          className={adminUi.btnGhost}
          onClick={onCancel}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
