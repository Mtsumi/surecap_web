"use client";

import { FormEvent } from "react";
import { adminUi } from "@/lib/adminUi";

export default function SteveCreditDecision({
  hasGuarantor,
  offerSentAt,
  submitting,
  reason,
  showRefuse,
  embedded = false,
  onApprove,
  onOfferGuarantor,
  onShowRefuse,
  onCancelRefuse,
  onReasonChange,
  onConfirmRefuse,
}: {
  hasGuarantor: boolean;
  offerSentAt?: string | null;
  submitting: boolean;
  reason: string;
  showRefuse: boolean;
  embedded?: boolean;
  onApprove: () => void;
  onOfferGuarantor: () => void;
  onShowRefuse: () => void;
  onCancelRefuse: () => void;
  onReasonChange: (value: string) => void;
  onConfirmRefuse: (event: FormEvent) => void;
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
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={submitting}
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
              Envoie un courriel au demandeur avec un lien pour ajouter un
              garant à cette même demande. S'ils n'en ont pas, ils doivent
              communiquer avec le concierge. Le dossier reste ouvert.
          {offerSentLabel ? ` Dernier envoi : ${offerSentLabel}.` : ""}
        </p>
      ) : null}
      {showRefuse ? (
        <form
          onSubmit={onConfirmRefuse}
          className="space-y-3 border-t border-[var(--ml-line)] pt-4"
        >
          <label className="block text-sm text-[var(--ml-steel)]">
            Note interne (pourquoi refuser)
            <textarea
              value={reason}
              onChange={(event) => onReasonChange(event.target.value)}
              className={`${adminUi.textarea} mt-1`}
              rows={3}
              required
              placeholder="Ex. crédit insuffisant"
            />
          </label>
          <p className="text-xs text-[var(--ml-steel)]">
            Enregistrée au dossier. Le courriel au demandeur n'est pas encore
            envoyé; on le rédigera ensuite.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className={`${adminUi.btnDanger} disabled:opacity-50`}
            >
              Confirmer le refus
            </button>
            <button
              type="button"
              disabled={submitting}
              className={adminUi.btnGhost}
              onClick={onCancelRefuse}
            >
              Annuler
            </button>
          </div>
        </form>
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
