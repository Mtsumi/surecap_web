"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { adminUi } from "@/lib/adminUi";
import type { RejectionEmailDraft } from "@/lib/adminApi";
import { useAdminCopy } from "../AdminLocaleContext";

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
  submitLabel?: string;
  submitClassName?: string;
  showReason?: boolean;
  hint?: string;
};

export default function RejectionEmailComposer({
  loadDraft,
  submitting,
  onCancel,
  onConfirm,
  initialReason = "",
  title,
  submitLabel,
  submitClassName = adminUi.btnDanger,
  showReason = true,
  hint,
}: Props) {
  const { t } = useAdminCopy();
  const [reason, setReason] = useState(initialReason);
  const [locale, setLocale] = useState<"fr" | "en">("fr");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [ccJanitor, setCcJanitor] = useState(false);
  const [janitorEmail, setJanitorEmail] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [draftError, setDraftError] = useState<string | null>(null);
  // Keep latest loader without putting it in effect deps (parents pass inline arrows).
  const loadDraftRef = useRef(loadDraft);
  loadDraftRef.current = loadDraft;

  const resolvedTitle = title ?? t("rejectComposerTitle");
  const resolvedSubmit = submitLabel ?? t("rejectComposerSubmit");

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
        const draft = await loadDraftRef.current({
          locale: nextLocale,
          reason: nextReason,
        });
        applyDraft(draft);
      } catch (e) {
        setDraftError(
          e instanceof Error ? e.message : t("composerDraftError")
        );
      } finally {
        setLoadingDraft(false);
      }
    },
    [applyDraft, t]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDraft(true);
      setDraftError(null);
      try {
        const draft = await loadDraftRef.current({ reason: initialReason });
        if (!cancelled) applyDraft(draft);
      } catch (e) {
        if (!cancelled) {
          setDraftError(
            e instanceof Error ? e.message : t("composerDraftError")
          );
        }
      } finally {
        if (!cancelled) setLoadingDraft(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyDraft, initialReason, t]);

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

  const defaultHint = showReason
    ? `${t("rejectComposerHintCc")}${
        janitorEmail ? ` (${janitorEmail})` : ""
      }${ccJanitor ? "." : t("rejectComposerHintNoCc")}`
    : `${t("offerComposerHint")}${
        janitorEmail
          ? t("offerComposerHintJanitor").replace("{email}", janitorEmail)
          : ""
      }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border-t border-[var(--ml-line)] pt-4">
      <h3 className="text-sm font-semibold text-[var(--ml-ink)]">{resolvedTitle}</h3>
      <p className="text-xs text-[var(--ml-steel)]">{hint ?? defaultHint}</p>

      {showReason ? (
        <>
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("composerReasonLabel")}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className={`${adminUi.textarea} mt-1`}
              placeholder={t("composerReasonPlaceholder")}
            />
          </label>
          <button
            type="button"
            disabled={loadingDraft || submitting}
            onClick={() => void refreshDraft(locale, reason)}
            className={`${adminUi.btnGhost} text-xs`}
          >
            {t("composerReinjectReason")}
          </button>
        </>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-[var(--ml-steel)]">{t("composerEmailLocale")}</span>
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
          {t("composerEmailLocaleHint")}
        </span>
      </div>

      {draftError ? <p className={adminUi.alertError}>{draftError}</p> : null}
      {loadingDraft ? (
        <p className="text-sm text-[var(--ml-steel)]">{t("composerDraftLoading")}</p>
      ) : null}

      <label className="block text-sm text-[var(--ml-steel)]">
        {t("composerSubject")}
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
        {t("composerBody")}
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
          className={`${submitClassName} disabled:opacity-50`}
        >
          {resolvedSubmit}
        </button>
        <button
          type="button"
          disabled={submitting}
          className={adminUi.btnGhost}
          onClick={onCancel}
        >
          {t("composerCancel")}
        </button>
      </div>
    </form>
  );
}
