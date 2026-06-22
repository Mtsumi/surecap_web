"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import { ApplicationListItem, listApplications } from "@/lib/adminApi";

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    accepted: "bg-[#e8f5e9] text-[#1a3d22]",
    rejected: "bg-[#fdf5f5] text-[#7f1d1d]",
    submitted: "bg-[#eef2ff] text-[#3730a3]",
    collecting: "bg-[#fff7ed] text-[#9a3412]",
    draft: "bg-[#f5f5f4] text-[#57534e]",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${colors[status] || colors.draft}`}
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
      <h1 className="text-lg font-semibold text-[#292524]">Demandes</h1>
      <p className="mt-1 text-sm text-[#78716c]">
        {total} soumise{total === 1 ? "" : "s"} (brouillons exclus)
      </p>

      {error && <p className="mt-4 text-sm text-[#7f1d1d]">{error}</p>}
      {loading && <p className="mt-6 text-sm text-[#78716c]">Chargement…</p>}

      {!loading && items.length === 0 && (
        <p className="mt-6 text-sm text-[#78716c]">Aucune demande pour le moment.</p>
      )}

      <ul className="mt-6 divide-y divide-[#ebe5db] rounded border border-[#e7e0d5] bg-[#fffef9]">
        {items.map((app) => (
          <li key={app.id}>
            <Link
              href={`/admin/applications/${app.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 hover:bg-[#faf8f4]"
            >
              <div>
                <p className="font-medium text-[#292524]">
                  #{app.id}{" "}
                  {[app.given_name, app.family_name].filter(Boolean).join(" ") || "—"}
                </p>
                <p className="text-sm text-[#78716c]">
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
