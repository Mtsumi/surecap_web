"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "../../AdminShell";
import {
  ApplicationDetail,
  ApplicationJob,
  acceptApplication,
  getApplication,
  getApplicationJobs,
  rejectApplication,
} from "@/lib/adminApi";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-[#a8a29e]">{label}</dt>
      <dd className="mt-0.5 text-sm text-[#292524]">{value}</dd>
    </div>
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

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-[#292524]">
        Demande #{app.id} — {[app.given_name, app.family_name].filter(Boolean).join(" ")}
      </h1>
      <p className="mt-1 text-sm text-[#78716c]">
        {app.building_name} · {app.unit_number} ·{" "}
        <span className="font-medium">{app.status}</span>
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

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <Field label="Courriel" value={app.email} />
        <Field label="Téléphone" value={app.phone} />
        <Field label="Adresse" value={app.current_address} />
        <Field label="Date d'emménagement" value={app.move_in_date} />
        <Field label="Tél. locateur" value={app.landlord_phone} />
        <Field label="Tél. RH" value={app.hr_phone} />
        <Field label="Raison du refus" value={app.rejection_reason} />
      </dl>

      <h2 className="mt-10 text-base font-medium text-[#292524]">Tâches / screening</h2>
      <table className="mt-3 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#e7e0d5] text-xs uppercase text-[#a8a29e]">
            <th className="py-2">Type</th>
            <th className="py-2">Statut</th>
            <th className="py-2">Message</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} className="border-b border-[#f0ebe3]">
              <td className="py-2">{j.job_type}</td>
              <td className="py-2">{j.status}</td>
              <td className="py-2 text-[#78716c]">{j.message || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {jobs.length === 0 && (
        <p className="mt-2 text-sm text-[#78716c]">Aucune tâche pour cette demande.</p>
      )}
    </AdminShell>
  );
}
