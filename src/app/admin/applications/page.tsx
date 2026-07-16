"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import { ApplicationListItem, listApplications } from "@/lib/adminApi";

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    accepted: "bg-[#e4f3eb] text-[var(--ml-pine)]",
    rejected: "bg-[#fdf5f5] text-[#7f1d1d]",
    submitted: "bg-[#eef2f7] text-[var(--ml-ink)]",
    collecting: "bg-[#fbf3e3] text-[var(--ml-amber)]",
    draft: "bg-[var(--ml-paper)] text-[var(--ml-steel)]",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${colors[status] || colors.draft}`}
    >
      {status}
    </span>
  );
}

export default function ApplicationsPage() {
  const [items, setItems] = useState<ApplicationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listApplications({ limit: 50 })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell>
      <h1 className="admin-display text-2xl font-extrabold tracking-tight text-[var(--ml-ink)]">
        Demandes
      </h1>
      <p className="mt-1 text-sm text-[var(--ml-steel)]">
        {total} soumise{total === 1 ? "" : "s"} (brouillons exclus)
      </p>

      {error && <p className="mt-4 text-sm text-[#7f1d1d]">{error}</p>}
      {loading && <p className="mt-6 text-sm text-[var(--ml-steel)]">Chargement…</p>}

      {!loading && items.length === 0 && (
        <p className="mt-6 text-sm text-[var(--ml-steel)]">Aucune demande pour le moment.</p>
      )}

      <ul className="mt-6 divide-y divide-[var(--ml-line)] overflow-hidden rounded-xl border border-[var(--ml-line)] bg-[var(--ml-card)]">
        {items.map((app) => (
          <li key={app.id}>
            <Link
              href={`/admin/applications/${app.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-[var(--ml-paper)]"
            >
              <div>
                <p className="font-semibold text-[var(--ml-ink)]">
                  #{app.id}{" "}
                  {[app.given_name, app.family_name].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-sm text-[var(--ml-steel)]">
                  {app.building_name} · {app.unit_number}
                </p>
              </div>
              {statusBadge(app.status)}
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
