"use client";

import { useEffect, useState } from "react";
import type { MemberIdentityStatus } from "@/lib/api";
import { adminUi } from "@/lib/adminUi";

function statusLabel(identity: MemberIdentityStatus): string {
  if (!identity.applies) return "Non applicable (garant)";
  if (identity.met_in_person === true) return "Rencontre confirmée";
  if (identity.selfie_uploaded) {
    if (identity.match_status === "fail") {
      return "Selfie reçu — correspondance à vérifier";
    }
    if (identity.match_status === "pass") return "Selfie reçu — correspondance OK";
    if (identity.match_status === "pending") return "Selfie reçu — analyse en cours";
    return "Selfie reçu";
  }
  if (identity.met_in_person === false) return "Selfie demandé — en attente";
  if (!identity.id_document_id) return "Pièce d'identité manquante";
  if (!identity.id_viewed) return "Ouvrir la pièce d'identité d'abord";
  return "En attente de confirmation";
}

export default function MemberIdentityPanel({
  identity,
  disabled,
  submitting,
  onOpenId,
  onConfirmMet,
  onConfirmNotMet,
}: {
  identity: MemberIdentityStatus | null | undefined;
  disabled?: boolean;
  submitting?: boolean;
  onOpenId?: () => void | Promise<void>;
  onConfirmMet: () => void | Promise<void>;
  onConfirmNotMet: () => void | Promise<void>;
}) {
  if (!identity?.applies) return null;

  const canConfirm = Boolean(identity.id_viewed) && !disabled;
  const matchFail = identity.match_status === "fail";

  return (
    <div className="sm:col-span-2 rounded border border-[var(--ml-line)] bg-[var(--ml-mist)]/40 p-3">
      <dt className="admin-field-label">Vérification d&apos;identité</dt>
      <dd className="admin-field-value mt-1 space-y-2">
        <p className="text-sm text-[var(--ml-ink)]">{statusLabel(identity)}</p>
        {matchFail && identity.match_notes ? (
          <p className="text-sm text-[#7f1d1d]">{identity.match_notes}</p>
        ) : null}
        {identity.id_document_id && onOpenId ? (
          <button
            type="button"
            className={adminUi.link}
            disabled={submitting}
            onClick={() => void onOpenId()}
          >
            {identity.id_viewed
              ? "Revoir la pièce d'identité"
              : "Ouvrir la pièce d'identité"}
          </button>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            disabled={!canConfirm || submitting}
            className={`${adminUi.btnSecondary} disabled:opacity-50`}
            onClick={() => void onConfirmMet()}
          >
            Oui, je l&apos;ai rencontré(e)
          </button>
          <button
            type="button"
            disabled={!canConfirm || submitting}
            className={`${adminUi.btnSecondary} disabled:opacity-50`}
            onClick={() => void onConfirmNotMet()}
          >
            Non — demander un selfie
          </button>
        </div>
        {!identity.id_viewed && identity.id_document_id ? (
          <p className="text-xs text-[var(--ml-steel)]">
            Les boutons restent désactivés tant que la pièce d&apos;identité n&apos;a
            pas été ouverte.
          </p>
        ) : null}
      </dd>
    </div>
  );
}

export function IdentityGateBanner({
  ready,
  blockers,
  matchFlags,
}: {
  ready: boolean;
  blockers?: Array<{ name: string; reason: string }>;
  matchFlags?: Array<{ name: string; match_status: string; notes?: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(!ready || Boolean(matchFlags?.length));
  }, [ready, matchFlags?.length]);

  if (ready && !matchFlags?.length) return null;
  if (!open) return null;

  return (
    <div
      className={`rounded border px-4 py-3 text-sm ${
        ready
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-red-200 bg-red-50 text-red-950"
      }`}
    >
      {!ready ? (
        <p>
          Acceptation bloquée — identité incomplète pour :{" "}
          {(blockers || []).map((b) => b.name).join(", ") || "—"}.
        </p>
      ) : null}
      {matchFlags?.length ? (
        <p className={!ready ? "mt-1" : undefined}>
          Correspondance selfie à vérifier :{" "}
          {matchFlags.map((f) => f.name).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
