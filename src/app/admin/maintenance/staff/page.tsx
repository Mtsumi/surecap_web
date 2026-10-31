"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AdminUser,
  BuildingAdmin,
  listAdminUsers,
  listBuildingsAdmin,
  updateAdminUser,
} from "@/lib/adminApi";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import {
  MAINTENANCE_ROLES,
  maintenanceRoleLabel,
} from "@/lib/maintenanceAdmin";
import type { Locale } from "@/lib/i18n";

export default function MaintenanceStaffPage() {
  const { t, locale } = useAdminLocaleContext();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = async () => {
    const [u, b] = await Promise.all([listAdminUsers(), listBuildingsAdmin()]);
    setUsers(u.filter((x) => x.active));
    setBuildings(b);
  };

  useEffect(() => {
    load().catch((e) =>
      setError(formatAdminFetchError(e, locale, t("maintenanceStaffError")))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount (super-admin gated in layout)
  }, []);

  const saveUser = async (
    user: AdminUser,
    maintenance_role: string | null,
    janitor_building_ids: number[] | null
  ) => {
    setSavingId(user.id);
    setError(null);
    setMessage(null);
    try {
      await updateAdminUser(user.id, {
        maintenance_role,
        janitor_building_ids,
      });
      setMessage(t("maintenanceStaffSaved"));
      await load();
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("maintenanceStaffError")));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      <p className="mb-2">
        <Link href="/admin/maintenance" className={adminUi.link}>
          {t("maintenanceBack")}
        </Link>
      </p>
      <h1 className={adminUi.pageTitle}>{t("maintenanceStaffTitle")}</h1>
      <p className={adminUi.pageSubtitle}>{t("maintenanceStaffSubtitle")}</p>

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {message ? <p className={`${adminUi.alertSuccess} mt-4`}>{message}</p> : null}

      <ul className={`${adminUi.list} mt-8 space-y-6`}>
        {users.map((user) => (
          <StaffRow
            key={user.id}
            user={user}
            buildings={buildings}
            locale={locale}
            t={t}
            busy={savingId === user.id}
            onSave={saveUser}
          />
        ))}
      </ul>
    </>
  );
}

function StaffRow({
  user,
  buildings,
  locale,
  t,
  busy,
  onSave,
}: {
  user: AdminUser;
  buildings: BuildingAdmin[];
  locale: Locale;
  t: (key: AdminMessageKey) => string;
  busy: boolean;
  onSave: (
    user: AdminUser,
    role: string | null,
    buildingIds: number[] | null
  ) => Promise<void>;
}) {
  const [role, setRole] = useState<string>(user.maintenance_role ?? "");
  const [buildingIds, setBuildingIds] = useState<number[]>(
    user.janitor_building_ids ?? []
  );

  useEffect(() => {
    setRole(user.maintenance_role ?? "");
    setBuildingIds(user.janitor_building_ids ?? []);
  }, [user]);

  const toggleBuilding = (id: number) => {
    setBuildingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <li className={`${adminUi.card} ${adminUi.cardPad}`}>
      <p className="font-semibold text-[var(--ml-ink)]">{user.email}</p>
      {user.is_super_admin ? (
        <p className="text-xs text-[var(--ml-steel)]">{t("teamSuperAdmin")}</p>
      ) : null}

      <label className="mt-4 block text-sm text-[var(--ml-steel)]">
        {t("maintenanceStaffRole")}
        <select
          className={adminUi.input}
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={busy}
        >
          <option value="">{t("maintenanceStaffNoRole")}</option>
          {MAINTENANCE_ROLES.map((r) => (
            <option key={r} value={r}>
              {maintenanceRoleLabel(r, locale)}
            </option>
          ))}
        </select>
      </label>

      {role === "janitor" ? (
        <div className="mt-4">
          <p className="text-sm text-[var(--ml-steel)]">
            {t("maintenanceStaffJanitorBuildings")}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            {buildings.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={buildingIds.includes(b.id)}
                  onChange={() => toggleBuilding(b.id)}
                  disabled={busy}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={`${adminUi.btnPrimary} mt-4`}
        disabled={busy}
        onClick={() =>
          void onSave(
            user,
            role || null,
            role === "janitor" ? buildingIds : null
          )
        }
      >
        {busy ? t("loading") : t("buildingsSave")}
      </button>
    </li>
  );
}
