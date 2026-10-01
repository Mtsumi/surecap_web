"use client";

import RejectionEmailComposer, {
  type RejectionComposeValues,
} from "./RejectionEmailComposer";
import type { RejectionEmailDraft } from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";

export default function SteveCreditDecision({
  hasGuarantor,
  offerSentAt,
  submitting,
  showRefuse,
  embedded = false,
  acceptDisabled = false,
  acceptDisabledReason,
  loadRejectionDraft,
  onApprove,
  onOfferGuarantor,
  onShowRefuse,
  onCancelRefuse,
  onConfirmRefuse,
}: {
  hasGuarantor: boolean;
  offerSentAt?: string | null;
  submitting: boolean;
  showRefuse: boolean;
  embedded?: boolean;
  acceptDisabled?: boolean;
  acceptDisabledReason?: string | null;
  loadRejectionDraft: (opts: {
    locale?: "fr" | "en";
    reason: string;
  }) => Promise<RejectionEmailDraft>;
  onApprove: () => void;
  onOfferGuarantor: () => void;
  onShowRefuse: () => void;
  onCancelRefuse: () => void;
  onConfirmRefuse: (values: RejectionComposeValues) => void | Promise<void>;
}) {
  const offerSentLabel = offerSentAt
    ? new Date(offerSentAt).toLocaleString("fr-CA")
    : null;

  const body = (
    <div className="space-y-4">
      <div>
        <h2 className={adminUi.sectionTitle}>Décision après crédit</h2>
        <p className={`${adminUi.pageSubtitle} mt-1`}>
          Si le crédit est acceptable, approuvez pour la signature du bail.
          {!hasGuarantor
            ? " Si le crédit n'est pas suffisant, vous pouvez proposer d'ajouter un garant."
            : ""}{" "}
          Sinon, refusez. Approuver enregistre la décision et lance la préparation
          du bail.
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
          Approuver pour la signature du bail
        </button>
        {!hasGuarantor ? (
          <button
            type="button"
            disabled={submitting}
            className={`${adminUi.btnSecondary} disabled:opacity-50`}
            onClick={onOfferGuarantor}
          >
            {offerSentAt
              ? "Renvoyer le courriel (ajouter un garant)"
              : "Proposer d'ajouter un garant"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={submitting}
          className={`${adminUi.btnDanger} disabled:opacity-50`}
          onClick={onShowRefuse}
        >
          Refuser la demande
        </button>
      </div>
      {!hasGuarantor ? (
        <p className="text-xs text-[var(--ml-steel)]">
          Envoie un courriel au demandeur avec un lien pour ajouter un garant à
          cette même demande. S&apos;ils n&apos;en ont pas, ils doivent
          communiquer avec le concierge. Le dossier reste ouvert.
          {offerSentLabel ? ` Dernier envoi : ${offerSentLabel}.` : ""}
        </p>
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
