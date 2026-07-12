"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../AdminShell";
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
import ApplicationDocuments from "./ApplicationDocuments";
import ScreeningJobs from "./ScreeningJobs";

function formatLivedDates(
  from: string | null | undefined,
  to: string | null | undefined
): string | null {
  if (!from) return null;
  return formatAddressDateRange("fr", from, to);
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[#a8a29e]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#292524]">{value}</dd>
    </div>
  );
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

function memberDisplayName(member: ApplicationMember): string {
  const legal = [member.given_name, member.family_name].filter(Boolean).join(" ");
  return legal || member.invited_name || "—";
}

function MemberCard({ member }: { member: ApplicationMember }) {
  const email = member.email || member.invited_email;
  return (
    <section className="rounded border border-[#e7e0d5] bg-[#fffef9] p-4">
      <h3 className="text-sm font-medium text-[#292524]">
        {memberRoleLabel(member.role)} — {memberDisplayName(member)}
      </h3>
      <p className="mt-1 text-xs text-[#78716c]">{memberStatusLabel(member.member_status)}</p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Courriel" value={email} />
        <Field label="Téléphone" value={member.phone} />
        <Field label="Date de naissance" value={member.date_of_birth} />
        <Field label="Adresse actuelle" value={member.current_address} />
        <Field
          label="Dates à l'adresse actuelle"
          value={formatLivedDates(
            member.current_address_lived_from,
            member.current_address_lived_to
          )}
        />
        {member.address_not_in_canada ? (
          <Field label="Adresse hors Canada" value="Oui" />
        ) : null}
        <Field label="Adresse précédente" value={member.previous_address} />
        <Field
          label="Dates à l'adresse précédente"
          value={formatLivedDates(
            member.previous_address_lived_from,
            member.previous_address_lived_to
          )}
        />
        {(member.role === "primary" || member.role === "roommate") && (
          <Field
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
            <Field label="Date d'emménagement" value={member.move_in_date} />
            <Field label="Locateur" value={member.landlord_name} />
            <Field label="Tél. locateur" value={member.landlord_phone} />
          </>
        )}
        <Field label="Contact RH" value={member.hr_name} />
        <Field label="Tél. RH" value={member.hr_phone} />
        {member.referral_source && (
          <Field label="Comment nous avez-vous trouvé?" value={member.referral_source} />
        )}
      </dl>
    </section>
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
    return (
      <AdminShell>
        <p className="text-sm text-[#78716c]">{error || "Chargement…"}</p>
      </AdminShell>
    );
  }

  const primaryName = [app.given_name, app.family_name].filter(Boolean).join(" ");

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-[#292524]">
        Demande #{app.id} — {primaryName || "Demandeur"}
      </h1>
      <p className="mt-1 text-sm text-[#78716c]">
        {app.building_name} · {app.unit_number} ·{" "}
        <span className="font-medium">{app.status}</span>
        {app.has_guarantor ? " · avec garant" : ""}
        {app.roommate_count ? ` · ${app.roommate_count} colocataire(s)` : ""}
      </p>

      {error && (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || app.status === "accepted"}
          onClick={onAccept}
          className="rounded bg-[#3d5a45] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Accepter
        </button>
      </div>

      <div className="mt-4 rounded border border-[#e7e0d5] bg-[#fffef9] p-4">
        <label className="block text-sm text-[#57534e]">
          Raison du refus
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded border border-[#e7e0d5] px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={busy || app.status === "rejected"}
          onClick={onReject}
          className="mt-3 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-4 py-2 text-sm text-[#7f1d1d] disabled:opacity-50"
        >
          Rejeter
        </button>
      </div>

      <h2 className="mt-10 text-base font-medium text-[#292524]">Membres du dossier</h2>
      <div className="mt-3 space-y-4">
        {sortedMembers.length > 0 ? (
          sortedMembers.map((member) => <MemberCard key={member.id} member={member} />)
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Courriel" value={app.email} />
            <Field label="Téléphone" value={app.phone} />
            <Field label="Adresse" value={app.current_address} />
            <Field label="Date d'emménagement" value={app.move_in_date} />
            <Field label="Locateur" value={app.landlord_name} />
            <Field label="Tél. locateur" value={app.landlord_phone} />
            <Field label="Contact RH" value={app.hr_name} />
            <Field label="Tél. RH" value={app.hr_phone} />
          </dl>
        )}
      </div>

      <h2 className="mt-10 text-base font-medium text-[#292524]">Documents</h2>
      <ApplicationDocuments
        applicationId={app.id}
        members={sortedMembers}
        summaryPdfAvailable={Boolean(app.summary_pdf_available)}
        dropboxDossierReady={Boolean(app.dropbox_dossier_ready)}
        memberRoleLabel={memberRoleLabel}
        memberDisplayName={memberDisplayName}
        onSummaryRegenerated={load}
      />

      <Field label="Raison du refus" value={app.rejection_reason} />

      <h2 className="mt-10 text-base font-medium text-[#292524]">Tâches / screening</h2>
      <ScreeningJobs jobs={jobs} jobMemberLabel={jobMemberLabel} />
    </AdminShell>
  );
}
