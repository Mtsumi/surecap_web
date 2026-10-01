"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdminField from "../../components/AdminField";
import AdminCollapsible from "../../components/AdminCollapsible";
import {
  ApplicationDetail,
  ApplicationJob,
  ApplicationMember,
  acceptApplication,
  adminMe,
  confirmMemberIdentity,
  fetchRejectionEmailDraft,
  getApplication,
  getApplicationJobs,
  offerGuarantor,
  rejectApplication,
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
} from "@/lib/adminDocuments";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
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

function formatLivedDates(
  from: string | null | undefined,
  to: string | null | undefined
): string | null {
  if (!from) return null;
  return formatAddressDateRange("fr", from, to);
}

function memberRoleLabel(role: string): string {
  switch (role) {
    case "primary":
      return "Demandeur principal";
    case "roommate":
      return "Colocataire";
    case "guarantor":
      return "Garant";
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
  onConfirmIdentity,
}: {
  member: ApplicationMember;
  disabled?: boolean;
  submitting?: boolean;
  onOpenId?: () => void;
  onConfirmIdentity?: (met: boolean) => void | Promise<void>;
}) {
  const { t, locale } = useAdminLocaleContext();
  const email = member.email || member.invited_email;
  const defaultOpen = member.role === "primary";

  return (
    <AdminCollapsible
      compact
      defaultOpen={defaultOpen}
      title={memberDisplayName(member)}
      subtitle={`${memberRoleLabel(member.role)} · ${memberStatusLabel(member.member_status, locale)}`}
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
            onConfirmMet={() => onConfirmIdentity(true)}
            onConfirmNotMet={() => onConfirmIdentity(false)}
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
            member.current_address_lived_to
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
            member.previous_address_lived_to
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
  const { locale } = useAdminLocaleContext();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [jobs, setJobs] = useState<ApplicationJob[]>([]);
  const [reason, setReason] = useState("");
  const [acceptNote, setAcceptNote] = useState("");
  const [showRefuse, setShowRefuse] = useState(false);
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
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
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
    const tenants = members.filter(
      (m) => m.role === "primary" || m.role === "roommate"
    );
    if (tenants.length === 0) return true;
    return tenants.every((m) => m.identity?.ready_for_accept !== false);
  }, [members]);
  const identityBlockers = useMemo(
    () =>
      members
        .filter(
          (m) =>
            (m.role === "primary" || m.role === "roommate") &&
            m.identity?.ready_for_accept === false
        )
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
        .filter((m) => m.identity?.match_status === "fail")
        .map((m) => ({
          member_id: m.id,
          name: memberDisplayName(m),
          match_status: "fail",
          notes: m.identity?.match_notes,
        })),
    [members]
  );

  const onConfirmIdentity = async (memberId: number, met: boolean) => {
    setBusy(true);
    setError(null);
    setIdentityFlash(null);
    try {
      const updated = await confirmMemberIdentity(id, memberId, met);
      setApp(updated);
      setReviewRequest(null);
      const member = updated.members?.find((m) => m.id === memberId);
      const name = member ? memberDisplayName(member) : "le locataire";
      const email = member?.email || member?.invited_email;
      if (met) {
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
      setError(e instanceof Error ? e.message : "Erreur");
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
    if (!member) return `Membre #${memberId}`;
    return `${memberRoleLabel(member.role)} - ${memberDisplayName(member)}`;
  };

  const onAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await acceptApplication(id, acceptNote);
      setApp(updated);
      setAcceptNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const onReject = async (values: RejectionComposeValues) => {
    if (!values.email_body.trim()) {
      setError("Le message du courriel est obligatoire.");
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
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const onOfferGuarantor = async () => {
    const resend = Boolean(app?.guarantor_offer_sent_at);
    const ok = window.confirm(
      resend
        ? "Renvoyer le courriel au demandeur pour proposer d'ajouter un garant?"
        : "Envoyer un courriel au demandeur pour proposer d'ajouter un garant?"
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await offerGuarantor(id);
      setApp(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (!app) {
    return <p className={adminUi.empty}>{error || "Chargement…"}</p>;
  }

  const primaryName = [app.given_name, app.family_name].filter(Boolean).join(" ");
  const metaParts = [
    app.building_name,
    app.unit_number,
    app.has_guarantor ? "avec garant" : null,
    app.roommate_count ? `${app.roommate_count} colocataire(s)` : null,
  ].filter(Boolean);

  const documentCount =
    sortedMembers.reduce((count, member) => count + (member.documents?.length ?? 0), 0) +
    (app.summary_pdf_available ? 1 : 0);
  const talJobCount = jobs.filter((job) => job.job_type === "tal_screening").length;
  const screeningConcerns = app.screening_concerns ?? [];
  const screeningReviews = app.screening_reviews ?? [];
  const hasScreeningFlags =
    screeningConcerns.length > 0 || screeningReviews.length > 0;

  return (
    <>
      <Link href="/admin/applications" className={`${adminUi.link} text-sm`}>
        ← Demandes
      </Link>

      <header className={`${adminUi.card} mt-4`}>
        <div className={adminUi.cardPad}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className={adminUi.pageTitle}>
                Demande #{app.id}
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
              <IdentityUnlockStrip
                disabled={app.status === "accepted" || app.status === "rejected"}
                submitting={busy}
                items={sortedMembers
                  .filter(
                    (m) =>
                      m.identity?.applies &&
                      m.identity.ready_for_accept === false
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
                    onConfirmMet: () => onConfirmIdentity(m.id, true),
                    onConfirmNotMet: () => onConfirmIdentity(m.id, false),
                  }))}
              />
            </div>
          ) : null}

          {app.status === "accepted" && app.accept_note ? (
            <p className={`${adminUi.pageSubtitle} mt-4`}>
              Note d&apos;acceptation: {app.accept_note}
            </p>
          ) : null}

          {app.status === "awaiting_credit_check" ? (
            <>
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
                acceptDisabled={!identityReady}
                acceptDisabledReason={
                  !identityReady
                    ? "Identité incomplète: ouvrez la pièce d'identité puis confirmez rencontre ou selfie."
                    : null
                }
                loadRejectionDraft={({ locale, reason: draftReason }) =>
                  fetchRejectionEmailDraft(id, { locale, reason: draftReason })
                }
                onApprove={() => void onAccept()}
                onOfferGuarantor={() => void onOfferGuarantor()}
                onShowRefuse={() => setShowRefuse(true)}
                onCancelRefuse={() => setShowRefuse(false)}
                onConfirmRefuse={(values) => onReject(values)}
              />
            </>
          ) : null}

          {app.status !== "accepted" &&
          app.status !== "rejected" &&
          app.status !== "awaiting_credit_check" ? (
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
                  disabled={busy || !identityReady}
                  onClick={onAccept}
                  className={`${adminUi.btnPrimary} disabled:opacity-50`}
                >
                  Accepter
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowRefuse(true)}
                  className={adminUi.btnDanger}
                >
                  Refuser la demande
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
                <AdminField label="Raison du refus" value={app.rejection_reason} />
              ) : null}
              {app.rejection_email_subject || app.rejection_email_body ? (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-[var(--ml-ink)]">
                    Voir le courriel envoyé
                    {app.rejection_email_locale
                      ? ` (${app.rejection_email_locale.toUpperCase()})`
                      : ""}
                  </summary>
                  <div className="mt-2 space-y-2">
                    {app.rejection_email_subject ? (
                      <p className="text-[var(--ml-steel)]">
                        Objet : {app.rejection_email_subject}
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
          title="Membres du dossier"
          subtitle={
            sortedMembers.length > 0
              ? `${sortedMembers.length} membre${sortedMembers.length === 1 ? "" : "s"}`
              : "Informations du demandeur"
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
                  onConfirmIdentity={(met) => onConfirmIdentity(member.id, met)}
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
                  <AdminField
                    label="Locateur précédent"
                    value={app.previous_landlord_name}
                  />
                  <AdminField
                    label="Tél. locateur précédent"
                    value={app.previous_landlord_phone}
                  />
                </>
              ) : null}
              <AdminField label="Employeur" value={app.employer_name} />
              <AdminField label="Contact RH" value={app.hr_name} />
              <AdminField label="Tél. RH" value={app.hr_phone} />
            </dl>
          )}
        </AdminCollapsible>

        <div id="documents-section">
          <AdminCollapsible
            title="Documents"
            subtitle={
              documentCount > 0
                ? `${documentCount} fichier${documentCount === 1 ? "" : "s"}`
                : "Aucun document pour le moment"
            }
          >
            <ApplicationDocuments
              applicationId={app.id}
              members={sortedMembers}
              summaryPdfAvailable={Boolean(app.summary_pdf_available)}
              dropboxDossierReady={Boolean(app.dropbox_dossier_ready)}
              memberRoleLabel={memberRoleLabel}
              memberDisplayName={memberDisplayName}
              onSummaryRegenerated={load}
              reviewRequest={reviewRequest}
              onMemberDocumentPreviewed={() => {
                void getApplication(id).then(setApp).catch(() => undefined);
              }}
            />
          </AdminCollapsible>
        </div>

        <AdminCollapsible
          title="Screening"
          subtitle={
            jobs.length > 0
              ? `${jobs.length} tâche${jobs.length === 1 ? "" : "s"}`
              : "Aucun résultat pour le moment"
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
