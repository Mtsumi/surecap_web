"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminField from "../../components/AdminField";
import AdminCollapsible from "../../components/AdminCollapsible";
import {
  ApplicationDetail,
  ApplicationJob,
  ApplicationMember,
  JanitorReviewChecklist,
  acceptApplication,
  adminMe,
  confirmMemberIdentity,
  fetchGuarantorOfferEmailDraft,
  fetchRejectionEmailDraft,
  getApplication,
  getApplicationJobs,
  offerGuarantor,
  rejectApplication,
  requestCreditCheck,
} from "@/lib/adminApi";
import { formatAddressDateRange } from "@/lib/addressFormUtils";
import { adminUi, applicationStatusClass } from "@/lib/adminUi";
import { guarantorAddressOutsideQuebec } from "@/lib/quebecAddress";
import { applicationStatusLabel, memberStatusLabel } from "@/lib/adminStatus";
import ApplicationDocuments, { type DocumentReviewRequest } from "./ApplicationDocuments";
import ScreeningJobs from "./ScreeningJobs";
import {
  ID_REVIEW_DOCUMENT_TYPES,
  INCOME_REVIEW_DOCUMENT_TYPES,
  SELFIE_REVIEW_DOCUMENT_TYPES,
} from "@/lib/adminDocuments";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import { facebookLink } from "@/lib/facebookSearch";
import RejectionEmailComposer, {
  type RejectionComposeValues,
} from "../../components/RejectionEmailComposer";
import SteveCreditDecision from "../../components/SteveCreditDecision";
import ScreeningAcceptBanner from "./ScreeningAcceptBanner";
import MemberIdentityPanel, {
  IdentityGateBanner,
  IdentityUnlockStrip,
} from "../../components/MemberIdentityPanel";

const EMPTY_CHECKLIST: JanitorReviewChecklist = {
  called_employer: false,
  checked_social: false,
};

const CHECKLIST_KEYS: Array<{
  key: keyof JanitorReviewChecklist;
  labelKey: AdminMessageKey;
}> = [
  { key: "called_employer", labelKey: "reviewCheckEmployer" },
  { key: "checked_social", labelKey: "reviewCheckSocial" },
];

function formatLivedDates(
  from: string | null | undefined,
  to: string | null | undefined,
  locale: "fr" | "en"
): string | null {
  if (!from) return null;
  return formatAddressDateRange(locale, from, to);
}

function memberRoleLabel(
  role: string,
  t: (key: AdminMessageKey) => string
): string {
  switch (role) {
    case "primary":
      return t("reviewRolePrimary");
    case "roommate":
      return t("reviewRoleRoommate");
    case "guarantor":
      return t("reviewRoleGuarantor");
    default:
      return role;
  }
}

function memberDisplayName(member: ApplicationMember): string {
  const legal = [member.given_name, member.family_name].filter(Boolean).join(" ");
  return legal || member.invited_name || "—";
}

function MemberCard({
  member,
  disabled,
  submitting,
  onOpenId,
  onOpenSelfie,
  onConfirmIdentity,
  onConfirmSelfieMatch,
}: {
  member: ApplicationMember;
  disabled?: boolean;
  submitting?: boolean;
  onOpenId?: () => void;
  onOpenSelfie?: () => void;
  onConfirmIdentity?: (met: boolean) => void | Promise<void>;
  onConfirmSelfieMatch?: () => void | Promise<void>;
}) {
  const { t, locale } = useAdminLocaleContext();
  const email = member.email || member.invited_email;
  const defaultOpen = member.role === "primary";

  return (
    <AdminCollapsible
      compact
      defaultOpen={defaultOpen}
      title={memberDisplayName(member)}
      subtitle={`${memberRoleLabel(member.role, t)} · ${memberStatusLabel(member.member_status, locale)}`}
      bodyClassName="!pt-0"
    >
      <dl className="grid gap-4 sm:grid-cols-2">
        {onConfirmIdentity ? (
          <MemberIdentityPanel
            memberId={member.id}
            memberName={memberDisplayName(member)}
            identity={member.identity}
            disabled={disabled}
            submitting={submitting}
            onOpenId={onOpenId}
            onOpenSelfie={onOpenSelfie}
            onConfirmMet={() => onConfirmIdentity(true)}
            onConfirmNotMet={() => onConfirmIdentity(false)}
            onConfirmSelfieMatch={onConfirmSelfieMatch}
            guarantor={member.role === "guarantor"}
          />
        ) : null}
        <AdminField label="Courriel" value={email} />
        <AdminField label="Téléphone" value={member.phone} />
        <AdminField label="Date de naissance" value={member.date_of_birth} />
        <AdminField label="Adresse actuelle" value={member.current_address} />
        <AdminField
          label="Dates à l'adresse actuelle"
          value={formatLivedDates(
            member.current_address_lived_from,
            member.current_address_lived_to,
            locale
          )}
        />
        {member.address_not_in_canada ? (
          <AdminField label="Adresse hors Canada" value="Oui" />
        ) : null}
        {member.role === "guarantor" &&
        guarantorAddressOutsideQuebec(
          member.current_address || "",
          Boolean(member.address_not_in_canada)
        ) ? (
          <div className="sm:col-span-2">
            <p className={`${adminUi.alertWarn} text-sm`}>
              {t("guarantorOutsideQuebecReview")}
            </p>
          </div>
        ) : null}
        <AdminField label="Adresse précédente" value={member.previous_address} />
        <AdminField
          label="Dates à l'adresse précédente"
          value={formatLivedDates(
            member.previous_address_lived_from,
            member.previous_address_lived_to,
            locale
          )}
        />
        {(member.role === "primary" || member.role === "roommate") && (
          <AdminField
            label="Situation de logement"
            value={
              member.housing_status === "own_home"
                ? "Propriétaire"
                : member.housing_status === "renting"
                  ? "Locataire"
                  : null
            }
          />
        )}
        {member.role === "roommate" && (
          <AdminField label="Date d'emménagement" value={member.move_in_date} />
        )}
        {(member.role === "primary" || member.role === "roommate") &&
          member.housing_status !== "own_home" && (
          <>
            <AdminField
              label="Bail au nom du locataire"
              value={
                member.lease_in_name === null
                  ? null
                  : member.lease_in_name
                    ? "Oui"
                    : "Non"
              }
            />
            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
              <div className="rounded-md border border-[var(--ml-line)] bg-[var(--ml-paper)] p-3 space-y-1">
                <p className="admin-field-label">Locateur actuel</p>
                <p className="admin-field-value">{member.landlord_name || "—"}</p>
                {member.landlord_phone ? (
                  <a
                    href={`tel:${member.landlord_phone}`}
                    className="block text-sm text-[var(--ml-accent)] underline-offset-2 hover:underline"
                  >
                    {member.landlord_phone}
                  </a>
                ) : (
                  <p className="admin-field-value">—</p>
                )}
              </div>
              <div className="rounded-md border border-[var(--ml-line)] bg-[var(--ml-paper)] p-3 space-y-1">
                <p className="admin-field-label">Employeur</p>
                <p className="admin-field-value">{member.employer_name || "—"}</p>
              </div>
              {member.monthly_net_income != null ? (
                <AdminField
                  label="Revenu net mensuel (emploi)"
                  value={
                    typeof member.monthly_net_income === "number"
                      ? `$${member.monthly_net_income.toLocaleString("fr-CA", {
                          maximumFractionDigits: 0,
                        })}`
                      : String(member.monthly_net_income)
                  }
                />
              ) : null}
              {member.additional_monthly_net_income ? (
                <AdminField
                  label="Revenu additionnel"
                  value={`${
                    member.additional_income_kind === "government_benefits"
                      ? "Prestations"
                      : member.additional_income_kind === "other"
                        ? "Autre"
                        : "Revenu"
                  }: $${Number(member.additional_monthly_net_income).toLocaleString(
                    "fr-CA",
                    { maximumFractionDigits: 0 }
                  )}`}
                />
              ) : null}
              <div className="rounded-md border border-[var(--ml-line)] bg-[var(--ml-paper)] p-3 space-y-1">
                <p className="admin-field-label">Contact RH</p>
                <p className="admin-field-value">{member.hr_name || "—"}</p>
                {member.hr_phone ? (
                  <a
                    href={`tel:${member.hr_phone}`}
                    className="block text-sm text-[var(--ml-accent)] underline-offset-2 hover:underline"
                  >
                    {member.hr_phone}
                  </a>
                ) : (
                  <p className="admin-field-value">—</p>
                )}
              </div>
            </div>
            {member.previous_address ? (
              member.no_previous_landlord_contact ? (
                <AdminField
                  label="Locateur précédent"
                  value="Aucun contact fourni"
                />
              ) : (
                <>
                  <AdminField
                    label="Locateur précédent"
                    value={member.previous_landlord_name}
                  />
                  <AdminField
                    label="Tél. locateur précédent"
                    value={member.previous_landlord_phone}
                  />
                </>
              )
            ) : null}
          </>
        )}
        {member.housing_status === "own_home" && (member.hr_name || member.hr_phone) ? (
          <div className="rounded-md border border-[var(--ml-line)] bg-[var(--ml-paper)] p-3 space-y-1">
            <p className="admin-field-label">Contact RH</p>
            <p className="admin-field-value">{member.hr_name || "—"}</p>
            {member.hr_phone ? (
              <a
                href={`tel:${member.hr_phone}`}
                className="block text-sm text-[var(--ml-accent)] underline-offset-2 hover:underline"
              >
                {member.hr_phone}
              </a>
            ) : (
              <p className="admin-field-value">—</p>
            )}
          </div>
        ) : null}
        {(() => {
          const fb = facebookLink(member.facebook_url, memberDisplayName(member));
          if (!fb && !member.linkedin_url) return null;
          return (
            <>
              {fb ? (
                <div>
                  <dt className="admin-field-label">Facebook</dt>
                  <dd className="admin-field-value">
                    <a
                      href={fb.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--ml-accent)] underline-offset-2 hover:underline break-all"
                    >
                      {fb.label}
                    </a>
                  </dd>
                </div>
              ) : null}
              {member.linkedin_url ? (
                <div>
                  <dt className="admin-field-label">LinkedIn</dt>
                  <dd className="admin-field-value">
                    <a
                      href={member.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--ml-accent)] underline-offset-2 hover:underline break-all"
                    >
                      {member.linkedin_url}
                    </a>
                  </dd>
                </div>
              ) : null}
            </>
          );
        })()}
        {member.referral_source && (
          <AdminField
            label="Comment nous avez-vous trouvé?"
            value={member.referral_source}
          />
        )}
      </dl>
    </AdminCollapsible>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { locale, t } = useAdminLocaleContext();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [jobs, setJobs] = useState<ApplicationJob[]>([]);
  const [reason, setReason] = useState("");
  const [acceptNote, setAcceptNote] = useState("");
  const [checklist, setChecklist] = useState<JanitorReviewChecklist>(EMPTY_CHECKLIST);
  const [showRefuse, setShowRefuse] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<DocumentReviewRequest | null>(null);
  const [identityFlash, setIdentityFlash] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  /** Keep polling after Re-run until CORPIQ reaches a terminal status (avoids stale failed UI). */
  const [corpiqWatchUntil, setCorpiqWatchUntil] = useState(0);
  const [corpiqWatchMemberId, setCorpiqWatchMemberId] = useState<number | null>(
    null
  );

  const load = () => {
    Promise.all([getApplication(id), getApplicationJobs(id)])
      .then(([a, j]) => {
        setApp(a);
        setJobs(j);
        if (a.janitor_review_checklist) {
          setChecklist({
            called_employer: Boolean(a.janitor_review_checklist.called_employer),
            checked_social: Boolean(a.janitor_review_checklist.checked_social),
          });
        } else if (a.status === "submitted") {
          setChecklist(EMPTY_CHECKLIST);
        }
      })
      .catch((e) => setError(formatAdminFetchError(e, locale, t("teamError"))));
  };

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    load();
  }, [id]);

  useEffect(() => {
    adminMe()
      .then((user) => setIsSuperAdmin(Boolean(user.is_super_admin)))
      .catch(() => setIsSuperAdmin(false));
  }, []);

  const corpiqInFlight = jobs.some(
    (job) =>
      job.job_type === "corpiq_screening" &&
      (job.status === "pending" || job.status === "running")
  );
  const corpiqWatchActive = corpiqWatchUntil > Date.now();
  const shouldPollCorpiq = corpiqInFlight || corpiqWatchActive;

  useEffect(() => {
    if (!shouldPollCorpiq || !Number.isFinite(id)) return;
    const refreshJobs = () => {
      getApplicationJobs(id)
        .then((next) => {
          setJobs(next);
          if (corpiqWatchMemberId != null) {
            const corpiq = next.find(
              (j) =>
                j.job_type === "corpiq_screening" &&
                j.application_member_id === corpiqWatchMemberId
            );
            if (
              corpiq &&
              (corpiq.status === "completed" || corpiq.status === "failed")
            ) {
              setCorpiqWatchUntil(0);
              setCorpiqWatchMemberId(null);
            }
          }
        })
        .catch(() => undefined);
    };
    refreshJobs();
    const timer = window.setInterval(refreshJobs, 3000);
    return () => window.clearInterval(timer);
  }, [id, shouldPollCorpiq, corpiqWatchUntil, corpiqWatchMemberId]);

  const onCorpiqStarted = (memberId: number) => {
    setCorpiqWatchMemberId(memberId);
    setCorpiqWatchUntil(Date.now() + 120_000);
    load();
  };

  const members = app?.members ?? [];
  const identityReady = useMemo(() => {
    const applicable = members.filter((m) => m.identity?.applies);
    if (applicable.length === 0) return true;
    return applicable.every((m) => m.identity?.ready_for_accept !== false);
  }, [members]);
  const identityBlockers = useMemo(
    () =>
      members
        .filter((m) => m.identity?.applies && m.identity?.ready_for_accept === false)
        .map((m) => ({
          member_id: m.id,
          name: memberDisplayName(m),
          reason: m.identity?.blocking_reason || "identity_unconfirmed",
        })),
    [members]
  );
  const identityMatchFlags = useMemo(
    () =>
      members
        .filter(
          (m) =>
            m.identity?.match_status === "fail" &&
            m.identity.ready_for_accept !== true &&
            m.identity.met_in_person !== true
        )
        .map((m) => ({
          member_id: m.id,
          name: memberDisplayName(m),
          match_status: "fail",
          notes: m.identity?.match_notes,
        })),
    [members]
  );

  const onConfirmIdentity = async (
    memberId: number,
    met: boolean,
    selfieMatches = false
  ) => {
    setBusy(true);
    setError(null);
    setIdentityFlash(null);
    try {
      const updated = await confirmMemberIdentity(id, memberId, met, {
        idPhotoMatches: met ? true : undefined,
        selfieMatches,
      });
      setApp(updated);
      setReviewRequest(null);
      const member = updated.members?.find((m) => m.id === memberId);
      const name = member ? memberDisplayName(member) : "le locataire";
      const email = member?.email || member?.invited_email;
      if (selfieMatches) {
        setIdentityFlash(`Selfie confirmé pour ${name}.`);
      } else if (met) {
        setIdentityFlash(`Rencontre confirmée pour ${name}.`);
      } else if (email) {
        setIdentityFlash(
          `Selfie demandé: courriel envoyé à ${email} avec le lien de vérification.`
        );
      } else {
        setIdentityFlash(
          `Selfie demandé pour ${name}, mais aucun courriel n'est disponible sur le dossier.`
        );
      }
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("teamError")));
    } finally {
      setBusy(false);
    }
  };
  const sortedMembers = useMemo(() => {
    const order = { primary: 0, roommate: 1, guarantor: 2 };
    return [...members].sort(
      (a, b) =>
        (order[a.role as keyof typeof order] ?? 9) -
        (order[b.role as keyof typeof order] ?? 9)
    );
  }, [members]);

  const jobMemberLabel = (memberId: number) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return t("appDetailMemberFallback").replace("{id}", String(memberId));
    return `${memberRoleLabel(member.role, t)} - ${memberDisplayName(member)}`;
  };

  const checklistComplete =
    checklist.called_employer && checklist.checked_social;

  const onRequestCreditCheck = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await requestCreditCheck(id, checklist);
      setApp(updated);
      setIdentityFlash(t("appDetailCreditRequested"));
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("teamError")));
    } finally {
      setBusy(false);
    }
  };

  const onAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await acceptApplication(id, acceptNote);
      setApp(updated);
      setAcceptNote("");
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("teamError")));
    } finally {
      setBusy(false);
    }
  };

  const onReject = async (values: RejectionComposeValues) => {
    if (!values.email_body.trim()) {
      setError(t("composerBodyRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await rejectApplication(id, {
        reason: values.reason,
        locale: values.locale,
        email_subject: values.email_subject,
        email_body: values.email_body,
      });
      setApp(updated);
      setShowRefuse(false);
      setReason(values.reason);
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("teamError")));
    } finally {
      setBusy(false);
    }
  };

  const onOfferGuarantor = async (values: RejectionComposeValues) => {
    if (!values.email_body.trim() || !values.email_subject.trim()) {
      setError(t("composerSubjectBodyRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await offerGuarantor(id, {
        locale: values.locale,
        email_subject: values.email_subject,
        email_body: values.email_body,
      });
      setApp(updated);
      setShowOffer(false);
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("teamError")));
    } finally {
      setBusy(false);
    }
  };

  const onMemberDocumentPreviewed = useCallback(() => {
    // Refresh so identity Met/Not-met unlocks after ID open (id_viewed).
    void getApplication(id).then(setApp).catch(() => undefined);
  }, [id]);

  if (!app) {
    return <p className={adminUi.empty}>{error || t("loading")}</p>;
  }

  const primaryName = [app.given_name, app.family_name].filter(Boolean).join(" ");
  const metaParts = [
    app.building_name,
    app.unit_number,
    app.has_guarantor ? t("appDetailWithGuarantor") : null,
    app.roommate_count
      ? t("appDetailRoommates").replace("{count}", String(app.roommate_count))
      : null,
  ].filter(Boolean);

  const documentCount =
    sortedMembers.reduce((count, member) => count + (member.documents?.length ?? 0), 0) +
    (app.summary_pdf_available ? 1 : 0);
  const talJobCount = jobs.filter((job) => job.job_type === "tal_screening").length;
  const screeningConcerns = app.screening_concerns ?? [];
  const screeningReviews = app.screening_reviews ?? [];
  const hasScreeningFlags =
    screeningConcerns.length > 0 || screeningReviews.length > 0;

  const identityUnlockItems = sortedMembers
    .filter(
      (m) => m.identity?.applies && m.identity.ready_for_accept === false
    )
    .map((m) => ({
      memberId: m.id,
      name: memberDisplayName(m),
      identity: m.identity!,
      onOpenId: () => {
        setReviewRequest({
          memberId: m.id,
          documentTypes: ID_REVIEW_DOCUMENT_TYPES,
          nonce: Date.now(),
        });
        document
          .getElementById("documents-section")
          ?.scrollIntoView({ behavior: "smooth" });
      },
      onOpenSelfie: () => {
        setReviewRequest({
          memberId: m.id,
          documentTypes: SELFIE_REVIEW_DOCUMENT_TYPES,
          nonce: Date.now(),
        });
        document
          .getElementById("documents-section")
          ?.scrollIntoView({ behavior: "smooth" });
      },
      onConfirmMet: () => onConfirmIdentity(m.id, true),
      onConfirmNotMet: () => onConfirmIdentity(m.id, false),
      onConfirmSelfieMatch: () => onConfirmIdentity(m.id, false, true),
      guarantor: m.role === "guarantor",
    }));

  return (
    <>
      <Link href="/admin/applications" className={`${adminUi.link} text-sm`}>
        {t("appDetailBack")}
      </Link>

      <header className={`${adminUi.card} mt-4`}>
        <div className={adminUi.cardPad}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className={adminUi.pageTitle}>
                {t("appDetailTitle").replace("{id}", String(app.id))}
                {primaryName ? ` - ${primaryName}` : ""}
              </h1>
              <p className={adminUi.pageSubtitle}>{metaParts.join(" · ")}</p>
            </div>
            <span className={applicationStatusClass(app.status)}>
              {applicationStatusLabel(app.status, locale)}
            </span>
          </div>

          {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
          {identityFlash ? (
            <p className={`${adminUi.alertSuccess} mt-4`}>{identityFlash}</p>
          ) : null}

          {app.status !== "accepted" && app.status !== "rejected" ? (
            <div className="mt-4">
              <IdentityGateBanner
                ready={identityReady}
                blockers={identityBlockers}
                matchFlags={identityMatchFlags}
              />
              {/* On submitted, identity actions live inside Vérifications below. */}
              {app.status !== "submitted" ? (
                <IdentityUnlockStrip
                  disabled={false}
                  submitting={busy}
                  items={identityUnlockItems}
                />
              ) : null}
            </div>
          ) : null}

          {app.draft_nudge_sent_at ? (
            <p className={`${adminUi.pageSubtitle} mt-4`}>
              {t("draftNudgeSent").replace(
                "{when}",
                new Date(app.draft_nudge_sent_at).toLocaleString(
                  locale === "en" ? "en-CA" : "fr-CA"
                )
              )}
            </p>
          ) : null}
          {app.applicant_draft_nudge_sent_at ? (
            <p className={`${adminUi.pageSubtitle} mt-2`}>
              {t("applicantNudgeSent").replace(
                "{when}",
                new Date(app.applicant_draft_nudge_sent_at).toLocaleString(
                  locale === "en" ? "en-CA" : "fr-CA"
                )
              )}
            </p>
          ) : null}

          {app.status === "accepted" && app.accept_note ? (
            <p className={`${adminUi.pageSubtitle} mt-4`}>
              {t("appDetailAcceptNote").replace("{note}", app.accept_note)}
            </p>
          ) : null}

          {app.status === "awaiting_credit_check" ? (
            <>
              <section className={`${adminUi.card} mt-4`}>
                <div className={adminUi.cardHeader}>
                  <h2 className={adminUi.sectionTitle}>
                    {t("appDetailJanitorChecksTitle")}
                  </h2>
                  <p className={adminUi.pageSubtitle}>
                    {t("appDetailJanitorChecksSubtitle")}
                  </p>
                </div>
                <div className={`${adminUi.cardPad} space-y-2`}>
                  {CHECKLIST_KEYS.map(({ key, labelKey }) => (
                    <label
                      key={key}
                      className="flex items-start gap-3 text-sm text-[var(--ml-ink)]"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={Boolean(checklist[key])}
                        disabled
                        readOnly
                      />
                      <span>{t(labelKey)}</span>
                    </label>
                  ))}
                  <label className="flex items-start gap-3 text-sm text-[var(--ml-ink)]">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={identityReady}
                      disabled
                      readOnly
                    />
                    <span>{t("reviewIdentityConfirmedCheckbox")}</span>
                  </label>
                </div>
              </section>
              <ScreeningAcceptBanner
                concerns={screeningConcerns}
                reviews={screeningReviews}
                acceptNote={acceptNote}
                onAcceptNoteChange={setAcceptNote}
                showNoteField={hasScreeningFlags}
              />
              <SteveCreditDecision
                embedded
                hasGuarantor={Boolean(app.has_guarantor)}
                offerSentAt={app.guarantor_offer_sent_at}
                submitting={busy}
                showRefuse={showRefuse}
                showOffer={showOffer}
                acceptDisabled={!identityReady}
                acceptDisabledReason={
                  !identityReady ? t("creditIdentityIncomplete") : null
                }
                loadRejectionDraft={({ locale, reason: draftReason }) =>
                  fetchRejectionEmailDraft(id, { locale, reason: draftReason })
                }
                loadOfferDraft={({ locale }) =>
                  fetchGuarantorOfferEmailDraft(id, { locale })
                }
                onApprove={() => void onAccept()}
                onShowOffer={() => {
                  setShowRefuse(false);
                  setShowOffer(true);
                }}
                onCancelOffer={() => setShowOffer(false)}
                onConfirmOffer={(values) => void onOfferGuarantor(values)}
                onShowRefuse={() => {
                  setShowOffer(false);
                  setShowRefuse(true);
                }}
                onCancelRefuse={() => setShowRefuse(false)}
                onConfirmRefuse={(values) => onReject(values)}
              />
            </>
          ) : null}

          {app.status === "submitted" ? (
            <div className="mt-5 space-y-4 border-t border-[var(--ml-line)] pt-5">
              <ScreeningAcceptBanner
                concerns={screeningConcerns}
                reviews={screeningReviews}
                acceptNote={acceptNote}
                onAcceptNoteChange={setAcceptNote}
                showNoteField={hasScreeningFlags}
              />
              <section className={adminUi.card} id="verifications-section">
                <div className={adminUi.cardHeader}>
                  <h2 className={adminUi.sectionTitle}>{t("appDetailChecksTitle")}</h2>
                  <p className={adminUi.pageSubtitle}>
                    {t("appDetailChecksSubtitle")}
                  </p>
                </div>
                <div className={`${adminUi.cardPad} space-y-4`}>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 text-sm text-[var(--ml-ink)]">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={identityReady}
                        disabled
                        readOnly
                      />
                      <span>
                        {t("reviewIdentityConfirmedCheckbox")}
                        {!identityReady ? (
                          <span className="mt-0.5 block text-[var(--ml-steel)]">
                            {t("reviewIdentityOpenThenYesNo")}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {CHECKLIST_KEYS.map(({ key, labelKey }) => (
                      <label
                        key={key}
                        className="flex items-start gap-3 text-sm text-[var(--ml-ink)]"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={checklist[key]}
                          disabled={busy}
                          onChange={(event) =>
                            setChecklist((current) => ({
                              ...current,
                              [key]: event.target.checked,
                            }))
                          }
                        />
                        <span>{t(labelKey)}</span>
                      </label>
                    ))}
                  </div>
                  {!identityReady ? (
                    <div className="space-y-3 border-t border-[var(--ml-line)] pt-3">
                      <p className="text-sm font-medium text-[var(--ml-ink)]">
                        {t("reviewTenantsIdentity")}
                      </p>
                      {identityUnlockItems.map((item) => (
                        <MemberIdentityPanel
                          key={item.memberId}
                          memberId={item.memberId}
                          memberName={item.name}
                          identity={item.identity}
                          disabled={false}
                          submitting={busy}
                          anchor
                          onOpenId={item.onOpenId}
                          onOpenSelfie={item.onOpenSelfie}
                          onConfirmMet={item.onConfirmMet}
                          onConfirmNotMet={item.onConfirmNotMet}
                          onConfirmSelfieMatch={item.onConfirmSelfieMatch}
                          guarantor={item.guarantor}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </section>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={busy || !identityReady || !checklistComplete}
                  onClick={() => void onRequestCreditCheck()}
                  className={`${adminUi.btnPrimary} disabled:opacity-50`}
                >
                  {t("reviewReadyForCredit")}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowRefuse(true)}
                  className={adminUi.btnDanger}
                >
                  {t("creditRefuse")}
                </button>
              </div>
              {showRefuse ? (
                <RejectionEmailComposer
                  loadDraft={({ locale, reason: draftReason }) =>
                    fetchRejectionEmailDraft(id, { locale, reason: draftReason })
                  }
                  submitting={busy}
                  onCancel={() => setShowRefuse(false)}
                  onConfirm={(values) => onReject(values)}
                  initialReason={reason}
                />
              ) : null}
            </div>
          ) : null}

          {app.status !== "accepted" &&
          app.status !== "rejected" &&
          app.status !== "awaiting_credit_check" &&
          app.status !== "submitted" ? (
            <div className="mt-5 space-y-4 border-t border-[var(--ml-line)] pt-5">
              <ScreeningAcceptBanner
                concerns={screeningConcerns}
                reviews={screeningReviews}
                acceptNote={acceptNote}
                onAcceptNoteChange={setAcceptNote}
                showNoteField={hasScreeningFlags}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowRefuse(true)}
                  className={adminUi.btnDanger}
                >
                  {t("creditRefuse")}
                </button>
              </div>
              {showRefuse ? (
                <RejectionEmailComposer
                  loadDraft={({ locale, reason: draftReason }) =>
                    fetchRejectionEmailDraft(id, { locale, reason: draftReason })
                  }
                  submitting={busy}
                  onCancel={() => setShowRefuse(false)}
                  onConfirm={(values) => onReject(values)}
                  initialReason={reason}
                />
              ) : null}
            </div>
          ) : null}

          {app.status === "rejected" ? (
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)] p-4">
              {app.rejection_reason ? (
                <AdminField
                  label={t("reviewRejectReasonLabel")}
                  value={app.rejection_reason}
                />
              ) : null}
              {app.rejection_email_subject || app.rejection_email_body ? (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-[var(--ml-ink)]">
                    {t("reviewViewSentEmail")}
                    {app.rejection_email_locale
                      ? ` (${app.rejection_email_locale.toUpperCase()})`
                      : ""}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {app.rejection_email_subject ? (
                      <p className="text-[var(--ml-steel)]">
                        {t("reviewSubjectPrefix").replace(
                          "{subject}",
                          app.rejection_email_subject
                        )}
                      </p>
                    ) : null}
                    {app.rejection_email_body ? (
                      <pre className="whitespace-pre-wrap rounded border border-[var(--ml-line)] bg-white p-3 text-xs text-[var(--ml-ink)]">
                        {app.rejection_email_body}
                      </pre>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className={adminUi.sectionGap}>
        <AdminCollapsible
          title={t("appDetailMembersTitle")}
          subtitle={
            sortedMembers.length > 0
              ? `${sortedMembers.length} membre${sortedMembers.length === 1 ? "" : "s"}`
              : t("appDetailApplicantInfo")
          }
        >
          {sortedMembers.length > 0 ? (
            <div className="space-y-3">
              {sortedMembers.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  disabled={app.status === "accepted" || app.status === "rejected"}
                  submitting={busy}
                  onOpenId={() => {
                    setReviewRequest({
                      memberId: member.id,
                      documentTypes: ID_REVIEW_DOCUMENT_TYPES,
                      nonce: Date.now(),
                    });
                    document
                      .getElementById("documents-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  onOpenSelfie={() => {
                    setReviewRequest({
                      memberId: member.id,
                      documentTypes: SELFIE_REVIEW_DOCUMENT_TYPES,
                      nonce: Date.now(),
                    });
                    document
                      .getElementById("documents-section")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  onConfirmIdentity={(met) => onConfirmIdentity(member.id, met)}
                  onConfirmSelfieMatch={() => onConfirmIdentity(member.id, false, true)}
                />
              ))}
            </div>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Courriel" value={app.email} />
              <AdminField label="Téléphone" value={app.phone} />
              <AdminField label="Adresse" value={app.current_address} />
              <AdminField label="Date d'emménagement" value={app.move_in_date} />
              <AdminField
                label="Situation de logement"
                value={
                  app.housing_status === "own_home"
                    ? "Propriétaire"
                    : app.housing_status === "renting"
                      ? "Locataire"
                      : null
                }
              />
              {app.housing_status !== "own_home" ? (
                <>
                  <AdminField label="Locateur actuel" value={app.landlord_name} />
                  <AdminField label="Tél. locateur actuel" value={app.landlord_phone} />
                  {app.no_previous_landlord_contact ? (
                    <AdminField
                      label="Locateur précédent"
                      value="Aucun contact fourni"
                    />
                  ) : (
                    <>
                      <AdminField
                        label="Locateur précédent"
                        value={app.previous_landlord_name}
                      />
                      <AdminField
                        label="Tél. locateur précédent"
                        value={app.previous_landlord_phone}
                      />
                    </>
                  )}
                </>
              ) : null}
              <AdminField label="Employeur" value={app.employer_name} />
              {app.monthly_net_income != null ? (
                <AdminField
                  label="Revenu net mensuel (emploi)"
                  value={`$${Number(app.monthly_net_income).toLocaleString("fr-CA", {
                    maximumFractionDigits: 0,
                  })}`}
                />
              ) : null}
              {app.additional_monthly_net_income ? (
                <AdminField
                  label="Revenu additionnel"
                  value={`${
                    app.additional_income_kind === "government_benefits"
                      ? "Prestations"
                      : app.additional_income_kind === "other"
                        ? "Autre"
                        : "Revenu"
                  }: $${Number(app.additional_monthly_net_income).toLocaleString(
                    "fr-CA",
                    { maximumFractionDigits: 0 }
                  )}`}
                />
              ) : null}
              <AdminField label="Contact RH" value={app.hr_name} />
              <AdminField label="Tél. RH" value={app.hr_phone} />
            </dl>
          )}
        </AdminCollapsible>

        <div id="documents-section">
          <AdminCollapsible
            title={t("appDetailDocumentsTitle")}
            subtitle={
              documentCount > 0
                ? `${documentCount} fichier${documentCount === 1 ? "" : "s"}`
                : t("appDetailDocumentsEmpty")
            }
          >
            <ApplicationDocuments
              applicationId={app.id}
              members={sortedMembers}
              summaryPdfAvailable={Boolean(app.summary_pdf_available)}
              dropboxDossierReady={Boolean(app.dropbox_dossier_ready)}
              memberRoleLabel={(role) => memberRoleLabel(role, t)}
              memberDisplayName={memberDisplayName}
              onSummaryRegenerated={load}
              reviewRequest={reviewRequest}
              onMemberDocumentPreviewed={onMemberDocumentPreviewed}
            />
          </AdminCollapsible>
        </div>

        <AdminCollapsible
          title={t("appDetailScreeningTitle")}
          subtitle={
            jobs.length > 0
              ? `${jobs.length} tâche${jobs.length === 1 ? "" : "s"}`
              : t("appDetailScreeningEmpty")
          }
        >
          <ScreeningJobs
            jobs={jobs}
            members={members}
            applicationId={id}
            isSuperAdmin={isSuperAdmin}
            onCorpiqStarted={onCorpiqStarted}
            householdAffordability={app.household_affordability}
            jobMemberLabel={jobMemberLabel}
            docsAnchor="#documents-section"
            onReviewDocuments={(memberId, kind) => {
              setReviewRequest({
                memberId,
                documentTypes:
                  kind === "id" ? ID_REVIEW_DOCUMENT_TYPES : INCOME_REVIEW_DOCUMENT_TYPES,
                nonce: Date.now(),
              });
            }}
          />
        </AdminCollapsible>
      </div>
    </>
  );
}
