"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdminField from "../../components/AdminField";
import {
  ApplicationDetail,
  ApplicationJob,
  ApplicationMember,
  acceptApplication,
  getApplication,
  getApplicationJobs,
  rejectApplication,
} from "@/lib/adminApi";
import { formatAddressDateRange } from "@/lib/addressFormUtils";
import { adminUi, applicationStatusClass } from "@/lib/adminUi";
import ApplicationDocuments from "./ApplicationDocuments";
import ScreeningJobs from "./ScreeningJobs";

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

function memberStatusLabel(status: string): string {
  switch (status) {
    case "submitted":
      return "Soumis";
    case "invited":
      return "Invité (en attente)";
    case "draft":
      return "Brouillon";
    default:
      return status;
  }
}

function applicationStatusLabel(status: string): string {
  switch (status) {
    case "accepted":
      return "Acceptée";
    case "rejected":
      return "Refusée";
    case "submitted":
      return "Soumise";
    case "collecting":
      return "En collecte";
    case "draft":
      return "Brouillon";
    default:
      return status;
  }
}

function memberDisplayName(member: ApplicationMember): string {
  const legal = [member.given_name, member.family_name].filter(Boolean).join(" ");
  return legal || member.invited_name || "—";
}

function MemberCard({ member }: { member: ApplicationMember }) {
  const email = member.email || member.invited_email;
  return (
    <article className={adminUi.cardPad}>
      <header className="border-b border-[var(--ml-line)] pb-3">
        <h3 className="admin-section-title text-base">
          {memberRoleLabel(member.role)}
        </h3>
        <p className="mt-0.5 text-sm font-medium text-[var(--ml-ink)]">
          {memberDisplayName(member)}
        </p>
        <p className="mt-1 text-xs text-[var(--ml-steel)]">
          {memberStatusLabel(member.member_status)}
        </p>
      </header>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
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
            label="Bail au nom du locataire"
            value={
              member.lease_in_name === null
                ? null
                : member.lease_in_name
                  ? "Oui"
                  : "Non"
            }
          />
        )}
        {member.role === "roommate" && (
          <>
            <AdminField label="Date d'emménagement" value={member.move_in_date} />
            <AdminField label="Locateur" value={member.landlord_name} />
            <AdminField label="Tél. locateur" value={member.landlord_phone} />
          </>
        )}
        <AdminField label="Contact RH" value={member.hr_name} />
        <AdminField label="Tél. RH" value={member.hr_phone} />
        {member.referral_source && (
          <AdminField
            label="Comment nous avez-vous trouvé?"
            value={member.referral_source}
          />
        )}
      </dl>
    </article>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [jobs, setJobs] = useState<ApplicationJob[]>([]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const members = app?.members ?? [];
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
    return `${memberRoleLabel(member.role)} — ${memberDisplayName(member)}`;
  };

  const onAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      const updated = await acceptApplication(id);
      setApp(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    if (!reason.trim()) {
      setError("Veuillez entrer une raison.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await rejectApplication(id, reason.trim());
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
                {primaryName ? ` — ${primaryName}` : ""}
              </h1>
              <p className={adminUi.pageSubtitle}>{metaParts.join(" · ")}</p>
            </div>
            <span className={applicationStatusClass(app.status)}>
              {applicationStatusLabel(app.status)}
            </span>
          </div>

          {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}

          {app.status !== "accepted" && app.status !== "rejected" ? (
            <div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--ml-line)] pt-5">
              <button
                type="button"
                disabled={busy}
                onClick={onAccept}
                className={adminUi.btnPrimary}
              >
                Accepter
              </button>
            </div>
          ) : null}

          {app.status !== "rejected" ? (
            <div className="mt-4 rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)] p-4">
              <label className="block text-sm text-[var(--ml-steel)]">
                Raison du refus
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  disabled={app.status === "rejected"}
                  className={adminUi.textarea}
                />
              </label>
              <button
                type="button"
                disabled={busy || app.status === "rejected"}
                onClick={onReject}
                className={`${adminUi.btnDanger} mt-3`}
              >
                Rejeter
              </button>
            </div>
          ) : null}

          {app.rejection_reason ? (
            <div className="mt-4 border-t border-[var(--ml-line)] pt-4">
              <AdminField label="Raison du refus" value={app.rejection_reason} />
            </div>
          ) : null}
        </div>
      </header>

      <section className={adminUi.sectionGap}>
        <h2 className={adminUi.sectionTitle}>Membres du dossier</h2>
        {sortedMembers.length > 0 ? (
          <div className={adminUi.dossierGrid}>
            {sortedMembers.map((member) => (
              <div key={member.id} className={adminUi.card}>
                <MemberCard member={member} />
              </div>
            ))}
          </div>
        ) : (
          <div className={`${adminUi.card} ${adminUi.cardPad}`}>
            <dl className="grid gap-4 sm:grid-cols-2">
              <AdminField label="Courriel" value={app.email} />
              <AdminField label="Téléphone" value={app.phone} />
              <AdminField label="Adresse" value={app.current_address} />
              <AdminField label="Date d'emménagement" value={app.move_in_date} />
              <AdminField label="Locateur" value={app.landlord_name} />
              <AdminField label="Tél. locateur" value={app.landlord_phone} />
              <AdminField label="Contact RH" value={app.hr_name} />
              <AdminField label="Tél. RH" value={app.hr_phone} />
            </dl>
          </div>
        )}
      </section>

      <section className={adminUi.sectionGap}>
        <h2 className={adminUi.sectionTitle}>Documents</h2>
        <div className={adminUi.cardPad + " " + adminUi.card}>
          <ApplicationDocuments
            applicationId={app.id}
            members={sortedMembers}
            summaryPdfAvailable={Boolean(app.summary_pdf_available)}
            dropboxDossierReady={Boolean(app.dropbox_dossier_ready)}
            memberRoleLabel={memberRoleLabel}
            memberDisplayName={memberDisplayName}
            onSummaryRegenerated={load}
          />
        </div>
      </section>

      <section className={adminUi.sectionGap}>
        <h2 className={adminUi.sectionTitle}>Screening</h2>
        <div className={adminUi.cardPad + " " + adminUi.card}>
          <ScreeningJobs jobs={jobs} jobMemberLabel={jobMemberLabel} />
        </div>
      </section>
    </>
  );
}
