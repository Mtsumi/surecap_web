"use client";

import { useState } from "react";
import type { MemberIdentityStatus } from "@/lib/api";
import { adminUi } from "@/lib/adminUi";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { useAdminCopy } from "../AdminLocaleContext";

export function identityMemberDomId(memberId: number): string {
  return `identity-member-${memberId}`;
}

export function scrollToIdentityMember(memberId: number): void {
  const el = document.getElementById(identityMemberDomId(memberId));
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function statusLabel(
  identity: MemberIdentityStatus,
  t: (key: AdminMessageKey) => string
): string {
  if (!identity.applies) return t("identityNAguarantor");
  if (identity.met_in_person === true) return t("identityMetConfirmed");
  if (identity.selfie_uploaded) {
    if (identity.match_status === "fail") {
      return t("identitySelfieFailReview");
    }
    if (identity.match_status === "pass") {
      return t("identitySelfiePass");
    }
    if (identity.match_status === "pending") {
      return t("identitySelfiePending");
    }
    return t("identitySelfieReceived");
  }
  if (identity.met_in_person === false) {
    return t("identitySelfieRequested");
  }
  if (!identity.id_document_id) return t("identityIdMissing");
  if (!identity.id_viewed) return t("identityOpenIdFirst");
  return t("identityAwaitingConfirm");
}

export function identityNextStep(
  reason: string | null | undefined,
  name: string,
  t: (key: AdminMessageKey) => string
): string {
  const withName = (key: AdminMessageKey) => t(key).replace("{name}", name);
  switch (reason) {
    case "id_not_viewed":
      return withName("identityNextIdNotViewed");
    case "identity_unconfirmed":
      return withName("identityNextUnconfirmed");
    case "selfie_pending":
      return withName("identityNextSelfiePending");
    case "selfie_awaiting_met":
      return withName("identityNextSelfieAwaiting");
    case "id_missing":
      return withName("identityNextIdMissing");
    default:
      return withName("identityNextDefault");
  }
}

type MeetChoice = "oui" | "non" | null;

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
  const { t } = useAdminCopy();
  const [choice, setChoice] = useState<MeetChoice>(null);
  const [idMatches, setIdMatches] = useState(false);

  if (!identity?.applies) return null;

  const canConfirm = Boolean(identity.id_viewed) && !disabled;
  const metConfirmed = identity.met_in_person === true;
  const matchFail =
    identity.match_status === "fail" && !metConfirmed;
  // Met stays available after selfie; credit/Accept wait on met confirmation.
  const showActions = canConfirm && !metConfirmed;
  const showRequestSelfie =
    showActions &&
    !identity.selfie_uploaded &&
    identity.met_in_person !== false;
  const showOpenId =
    Boolean(identity.id_document_id && onOpenId) && !metConfirmed;
  const showOpenSelfie =
    Boolean(identity.selfie_document_id && onOpenSelfie) && !metConfirmed;
  const title = memberName
    ? t("identityTitleNamed").replace("{name}", memberName)
    : t("identityTitle");

  const selectChoice = (next: MeetChoice) => {
    setChoice(next);
    if (next !== "oui") setIdMatches(false);
  };

  return (
    <div
      id={
        anchor && memberId != null ? identityMemberDomId(memberId) : undefined
      }
      className="sm:col-span-2 scroll-mt-4 rounded border border-[var(--ml-line)] bg-[var(--ml-mist)]/40 p-3"
    >
      <dt className="admin-field-label">{title}</dt>
      <dd className="admin-field-value mt-1 space-y-2">
        <p className="text-sm text-[var(--ml-ink)]">{statusLabel(identity, t)}</p>
        {matchFail ? (
          <p className="text-sm text-[#7f1d1d]">
            {identity.match_notes?.trim()
              ? identity.match_notes
              : t("identityMatchFailNote")}
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
                {identity.id_viewed ? t("identityReopenId") : t("identityOpenId")}
              </button>
            ) : null}
            {showOpenSelfie ? (
              <button
                type="button"
                className={adminUi.link}
                disabled={submitting}
                onClick={() => void onOpenSelfie?.()}
              >
                {t("identityViewSelfie")}
              </button>
            ) : null}
          </div>
        ) : null}
        {showActions ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--ml-ink)]">
              {t("identityMetQuestion")}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={!canConfirm || submitting}
                aria-pressed={choice === "oui"}
                className={`${adminUi.btnSecondary} disabled:opacity-50 ${
                  choice === "oui"
                    ? "ring-2 ring-[var(--ml-ink)] ring-offset-1"
                    : ""
                }`}
                onClick={() => selectChoice("oui")}
              >
                {t("identityYes")}
              </button>
              {showRequestSelfie ? (
                <button
                  type="button"
                  disabled={!canConfirm || submitting}
                  aria-pressed={choice === "non"}
                  className={`${adminUi.btnSecondary} disabled:opacity-50 ${
                    choice === "non"
                      ? "ring-2 ring-[var(--ml-ink)] ring-offset-1"
                      : ""
                  }`}
                  onClick={() => selectChoice("non")}
                >
                  {t("identityNo")}
                </button>
              ) : null}
            </div>
            {choice === "oui" ? (
              <div className="space-y-2 rounded border border-[var(--ml-line)] bg-white/60 p-3">
                <label className="flex items-start gap-3 text-sm text-[var(--ml-ink)]">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={idMatches}
                    disabled={submitting}
                    onChange={(event) => setIdMatches(event.target.checked)}
                  />
                  <span>{t("identityIdMatchesCheckbox")}</span>
                </label>
                <button
                  type="button"
                  disabled={!idMatches || submitting}
                  className={`${adminUi.btnPrimary} disabled:opacity-50`}
                  onClick={() => void onConfirmMet()}
                >
                  {t("identityConfirmMet")}
                </button>
              </div>
            ) : null}
            {choice === "non" && showRequestSelfie ? (
              <div className="space-y-2 rounded border border-[var(--ml-line)] bg-white/60 p-3">
                <p className="text-sm text-[var(--ml-steel)]">
                  {t("identitySelfieWillEmail")}
                </p>
                <button
                  type="button"
                  disabled={submitting}
                  className={`${adminUi.btnPrimary} disabled:opacity-50`}
                  onClick={() => void onConfirmNotMet()}
                >
                  {t("identitySendSelfieRequest")}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {!identity.id_viewed && identity.id_document_id && showActions ? (
          <p className="text-xs text-[var(--ml-steel)]">{t("identityButtonsLocked")}</p>
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
  const { t } = useAdminCopy();
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
          <p className="font-medium">{t("identityGateBlocked")}</p>
          <ul className="list-disc space-y-1 pl-5">
            {(blockers || []).map((b) => (
              <li key={b.member_id}>
                <span>{identityNextStep(b.reason, b.name, t)} </span>
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
                  {t("identityGoTo")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {matchFlags?.length ? (
        <p className={!ready ? "mt-2" : undefined}>
          {t("identityMatchFlags").replace(
            "{names}",
            matchFlags.map((f) => f.name).join(", ")
          )}
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
  const { t } = useAdminCopy();
  const pending = items.filter((item) => !item.identity.ready_for_accept);
  if (pending.length === 0) return null;

  return (
    <section className={`${adminUi.card} mt-3`}>
      <div className={adminUi.cardHeader}>
        <h2 className={adminUi.sectionTitle}>{t("identityStripTitle")}</h2>
        <p className={adminUi.pageSubtitle}>{t("identityStripSubtitle")}</p>
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
