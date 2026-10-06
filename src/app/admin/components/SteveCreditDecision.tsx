"use client";

import RejectionEmailComposer, {
  type RejectionComposeValues,
} from "./RejectionEmailComposer";
import type { RejectionEmailDraft } from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
import { useAdminCopy } from "../AdminLocaleContext";

export default function SteveCreditDecision({
  hasGuarantor,
  offerSentAt,
  submitting,
  showRefuse,
  showOffer,
  embedded = false,
  acceptDisabled = false,
  acceptDisabledReason,
  loadRejectionDraft,
  loadOfferDraft,
  onApprove,
  onShowOffer,
  onCancelOffer,
  onConfirmOffer,
  onShowRefuse,
  onCancelRefuse,
  onConfirmRefuse,
}: {
  hasGuarantor: boolean;
  offerSentAt?: string | null;
  submitting: boolean;
  showRefuse: boolean;
  showOffer: boolean;
  embedded?: boolean;
  acceptDisabled?: boolean;
  acceptDisabledReason?: string | null;
  loadRejectionDraft: (opts: {
    locale?: "fr" | "en";
    reason: string;
  }) => Promise<RejectionEmailDraft>;
  loadOfferDraft: (opts: {
    locale?: "fr" | "en";
  }) => Promise<RejectionEmailDraft>;
  onApprove: () => void;
  onShowOffer: () => void;
  onCancelOffer: () => void;
  onConfirmOffer: (values: RejectionComposeValues) => void | Promise<void>;
  onShowRefuse: () => void;
  onCancelRefuse: () => void;
  onConfirmRefuse: (values: RejectionComposeValues) => void | Promise<void>;
}) {
  const { locale, t } = useAdminCopy();
  const offerSentLabel = offerSentAt
    ? new Date(offerSentAt).toLocaleString(locale === "en" ? "en-CA" : "fr-CA")
    : null;

  const body = (
    <div className="space-y-4">
      <div>
        <h2 className={adminUi.sectionTitle}>{t("creditDecisionTitle")}</h2>
        <p className={`${adminUi.pageSubtitle} mt-1`}>
          {t("creditDecisionIntro")}
          {!hasGuarantor ? t("creditDecisionGuarantorHint") : ""}
          {t("creditDecisionRefuseHint")}
        </p>
        {acceptDisabled && acceptDisabledReason ? (
          <p className="mt-2 text-sm text-[#7f1d1d]">{acceptDisabledReason}</p>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={submitting || acceptDisabled}
          className={`${adminUi.btnPrimary} disabled:opacity-50`}
          onClick={onApprove}
        >
          {t("creditApprove")}
        </button>
        {!hasGuarantor ? (
          <button
            type="button"
            disabled={submitting}
            className={`${adminUi.btnSecondary} disabled:opacity-50`}
            onClick={onShowOffer}
          >
            {offerSentAt ? t("creditResendGuarantor") : t("creditOfferGuarantor")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={submitting}
          className={`${adminUi.btnDanger} disabled:opacity-50`}
          onClick={onShowRefuse}
        >
          {t("creditRefuse")}
        </button>
      </div>
      {!hasGuarantor ? (
        <p className="text-xs text-[var(--ml-steel)]">
          {t("creditOfferHint")}
          {offerSentLabel
            ? ` ${t("creditOfferLastSent").replace("{when}", offerSentLabel)}`
            : ""}
        </p>
      ) : null}
      {showOffer && !hasGuarantor ? (
        <RejectionEmailComposer
          title={t("offerComposerTitle")}
          submitLabel={t("offerComposerSubmit")}
          submitClassName={adminUi.btnPrimary}
          showReason={false}
          loadDraft={({ locale: draftLocale }) => loadOfferDraft({ locale: draftLocale })}
          submitting={submitting}
          onCancel={onCancelOffer}
          onConfirm={onConfirmOffer}
        />
      ) : null}
      {showRefuse ? (
        <RejectionEmailComposer
          loadDraft={loadRejectionDraft}
          submitting={submitting}
          onCancel={onCancelRefuse}
          onConfirm={onConfirmRefuse}
        />
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className="mt-5 border-t border-[var(--ml-line)] pt-5">{body}</div>;
  }

  return (
    <section className={`${adminUi.card} mt-6`}>
      <div className={adminUi.cardPad}>{body}</div>
    </section>
  );
}
