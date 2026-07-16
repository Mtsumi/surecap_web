"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import { ApplicationListItem, listApplications } from "@/lib/adminApi";

import { adminUi, applicationStatusClass } from "@/lib/adminUi";

function statusBadge(status: string) {
  return (
    <span className={applicationStatusClass(status)}>
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
      <h1 className={adminUi.pageTitle}>Demandes</h1>
      <p className={adminUi.pageSubtitle}>
        {total} soumise{total === 1 ? "" : "s"} (brouillons exclus)
      </p>

      {error && <p className={`${adminUi.alertError} mt-4`}>{error}</p>}
      {loading && <p className={`${adminUi.empty} mt-6`}>Chargement…</p>}

      {!loading && items.length === 0 && (
        <p className={`${adminUi.empty} mt-6`}>Aucune demande pour le moment.</p>
      )}

      <ul className={`${adminUi.list} mt-6`}>
        {items.map((app) => (
          <li key={app.id} className="!p-0">
            <Link
              href={`/admin/applications/${app.id}`}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-[var(--ml-paper)] sm:px-5"
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
