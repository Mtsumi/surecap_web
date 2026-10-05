"use client";

import type { MemberIdentityStatus } from "@/lib/api";
import { adminUi } from "@/lib/adminUi";

export function identityMemberDomId(memberId: number): string {
  return `identity-member-${memberId}`;
}

export function scrollToIdentityMember(memberId: number): void {
  const el = document.getElementById(identityMemberDomId(memberId));
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function statusLabel(identity: MemberIdentityStatus): string {
  if (!identity.applies) return "Non applicable (garant)";
  if (identity.met_in_person === true) return "Rencontre confirmée";
  if (identity.selfie_uploaded) {
    if (identity.match_status === "fail") {
      return "Selfie reçu - correspondance à vérifier, puis confirmez la rencontre";
    }
    if (identity.match_status === "pass") {
      return "Selfie reçu - correspondance OK, confirmez la rencontre";
    }
    if (identity.match_status === "pending") {
      return "Selfie reçu - analyse en cours";
    }
    return "Selfie reçu - confirmez la rencontre";
  }
  if (identity.met_in_person === false) {
    return "Selfie demandé - courriel envoyé au demandeur";
  }
  if (!identity.id_document_id) return "Pièce d'identité manquante";
  if (!identity.id_viewed) return "Ouvrir la pièce d'identité d'abord";
  return "En attente de confirmation";
}

export function identityNextStep(reason: string | null | undefined, name: string): string {
  switch (reason) {
    case "id_not_viewed":
      return `Pour ${name} : ouvrez la pièce d'identité, puis confirmez la rencontre ou demandez un selfie.`;
    case "identity_unconfirmed":
      return `Pour ${name} : confirmez si vous l'avez rencontré(e), ou demandez un selfie.`;
    case "selfie_pending":
      return `Pour ${name} : selfie en attente. Vous pouvez aussi confirmer une rencontre si vous l'avez vu(e) depuis.`;
    case "selfie_awaiting_met":
      return `Pour ${name} : selfie reçu — comparez avec la pièce d'identité, puis confirmez la rencontre.`;
    case "id_missing":
      return `Pour ${name} : pièce d'identité manquante sur le dossier.`;
    default:
      return `Pour ${name} : complétez la vérification d'identité.`;
  }
}

export default function MemberIdentityPanel({
  memberId,
  memberName,
  identity,
  disabled,
  submitting,
  anchor = false,
  onOpenId,
  onOpenSelfie,
  onConfirmMet,
  onConfirmNotMet,
}: {
  memberId?: number;
  memberName?: string;
  identity: MemberIdentityStatus | null | undefined;
  disabled?: boolean;
  submitting?: boolean;
  /** Set true on the unlock-strip copy so banner CTAs scroll here (unique DOM id). */
  anchor?: boolean;
  onOpenId?: () => void | Promise<void>;
  onOpenSelfie?: () => void | Promise<void>;
  onConfirmMet: () => void | Promise<void>;
  onConfirmNotMet: () => void | Promise<void>;
}) {
  if (!identity?.applies) return null;

  const canConfirm = Boolean(identity.id_viewed) && !disabled;
  const metConfirmed = identity.met_in_person === true;
  const matchFail =
    identity.match_status === "fail" && !metConfirmed;
  // Met stays available after selfie; credit/Accept wait on met confirmation.
  const showMet = canConfirm && !metConfirmed;
  const showRequestSelfie =
    canConfirm &&
    !identity.selfie_uploaded &&
    identity.met_in_person !== false;
  const showOpenId =
    Boolean(identity.id_document_id && onOpenId) && !metConfirmed;
  const showOpenSelfie =
    Boolean(identity.selfie_document_id && onOpenSelfie) && !metConfirmed;
  const title = memberName
    ? `Vérification d'identité · ${memberName}`
    : "Vérification d'identité";

  return (
    <div
      id={
        anchor && memberId != null ? identityMemberDomId(memberId) : undefined
      }
      className="sm:col-span-2 scroll-mt-4 rounded border border-[var(--ml-line)] bg-[var(--ml-mist)]/40 p-3"
    >
      <dt className="admin-field-label">{title}</dt>
      <dd className="admin-field-value mt-1 space-y-2">
        <p className="text-sm text-[var(--ml-ink)]">{statusLabel(identity)}</p>
        {matchFail ? (
          <p className="text-sm text-[#7f1d1d]">
            La photo ne correspond pas à la pièce d&apos;identité.
          </p>
        ) : null}
        {showOpenId || showOpenSelfie ? (
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
            {showOpenId ? (
              <button
                type="button"
                className={adminUi.link}
                disabled={submitting}
                onClick={() => void onOpenId?.()}
              >
                {identity.id_viewed
                  ? "Revoir la pièce d'identité"
                  : "Ouvrir la pièce d'identité"}
              </button>
            ) : null}
            {showOpenSelfie ? (
              <button
                type="button"
                className={adminUi.link}
                disabled={submitting}
                onClick={() => void onOpenSelfie?.()}
              >
                Voir le selfie
              </button>
            ) : null}
          </div>
        ) : null}
        {showMet || showRequestSelfie ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {showMet ? (
              <button
                type="button"
                disabled={!canConfirm || submitting}
                className={`${adminUi.btnSecondary} disabled:opacity-50`}
                onClick={() => void onConfirmMet()}
              >
                Oui, je l&apos;ai rencontré(e)
              </button>
            ) : null}
            {showRequestSelfie ? (
              <button
                type="button"
                disabled={!canConfirm || submitting}
                className={`${adminUi.btnSecondary} disabled:opacity-50`}
                onClick={() => void onConfirmNotMet()}
              >
                Non - demander un selfie
              </button>
            ) : null}
          </div>
        ) : null}
        {!identity.id_viewed && identity.id_document_id && showMet ? (
          <p className="text-xs text-[var(--ml-steel)]">
            Les boutons restent désactivés tant que la pièce d&apos;identité
            n&apos;a pas été ouverte.
          </p>
        ) : null}
      </dd>
    </div>
  );
}

export type IdentityBlocker = {
  member_id: number;
  name: string;
  reason: string;
};

export type IdentityUnlockItem = {
  memberId: number;
  name: string;
  identity: MemberIdentityStatus;
  onOpenId?: () => void | Promise<void>;
  onOpenSelfie?: () => void | Promise<void>;
  onConfirmMet: () => void | Promise<void>;
  onConfirmNotMet: () => void | Promise<void>;
};

export function IdentityGateBanner({
  ready,
  blockers,
  matchFlags,
}: {
  ready: boolean;
  blockers?: IdentityBlocker[];
  matchFlags?: Array<{
    member_id?: number;
    name: string;
    match_status: string;
    notes?: string | null;
  }>;
}) {
  if (ready && !matchFlags?.length) return null;

  return (
    <div
      className={`rounded border px-4 py-3 text-sm ${
        ready
          ? "border-amber-300 bg-amber-50 text-amber-950"
          : "border-red-200 bg-red-50 text-red-950"
      }`}
    >
      {!ready ? (
        <div className="space-y-2">
          <p className="font-medium">
            Acceptation bloquée: complétez l&apos;identité des locataires
            ci-dessous.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {(blockers || []).map((b) => (
              <li key={b.member_id}>
                <span>{identityNextStep(b.reason, b.name)} </span>
                <button
                  type="button"
                  className="underline underline-offset-2"
                  onClick={() => {
                    const verifications = document.getElementById(
                      "verifications-section"
                    );
                    if (verifications) {
                      verifications.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }
                    scrollToIdentityMember(b.member_id);
                  }}
                >
                  Aller à l&apos;identité
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {matchFlags?.length ? (
        <p className={!ready ? "mt-2" : undefined}>
          Correspondance selfie à vérifier:{" "}
          {matchFlags.map((f) => f.name).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}

/** Action strip under the banner so janitors need not hunt in member cards. */
export function IdentityUnlockStrip({
  items,
  disabled,
  submitting,
}: {
  items: IdentityUnlockItem[];
  disabled?: boolean;
  submitting?: boolean;
}) {
  const pending = items.filter((item) => !item.identity.ready_for_accept);
  if (pending.length === 0) return null;

  return (
    <section className={`${adminUi.card} mt-3`}>
      <div className={adminUi.cardHeader}>
        <h2 className={adminUi.sectionTitle}>Identité à compléter</h2>
        <p className={adminUi.pageSubtitle}>
          Ouvrez la pièce d&apos;identité, puis confirmez la rencontre ou
          demandez un selfie. Sans cela, l&apos;acceptation reste bloquée.
        </p>
      </div>
      <div className={`${adminUi.cardPad} space-y-3`}>
        {pending.map((item) => (
          <MemberIdentityPanel
            key={item.memberId}
            memberId={item.memberId}
            memberName={item.name}
            identity={item.identity}
            disabled={disabled}
            submitting={submitting}
            anchor
            onOpenId={item.onOpenId}
            onOpenSelfie={item.onOpenSelfie}
            onConfirmMet={item.onConfirmMet}
            onConfirmNotMet={item.onConfirmNotMet}
          />
        ))}
      </div>
    </section>
  );
}
