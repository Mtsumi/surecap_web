"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AdminUser,
  BuildingAdmin,
  createAdminUser,
  listAdminUsers,
  listBuildingsAdmin,
  updateAdminUser,
} from "@/lib/adminApi";
import type { AdminMessageKey } from "@/lib/adminI18n";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import type { Locale } from "@/lib/i18n";
import {
  MAINTENANCE_ROLES,
  maintenanceRoleLabel,
  roleNeedsBuildings,
} from "@/lib/maintenanceAdmin";
import { useAdminLocaleContext } from "../AdminLocaleContext";

export default function TeamPage() {
  const { t, locale } = useAdminLocaleContext();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [createRole, setCreateRole] = useState("");
  const [createBuildingIds, setCreateBuildingIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const [u, b] = await Promise.all([listAdminUsers(), listBuildingsAdmin()]);
    setUsers(u);
    setBuildings(b);
  };

  useEffect(() => {
    load().catch((e) => setError(formatAdminFetchError(e, locale, t("teamError"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const role = createRole || null;
      await createAdminUser({
        email: email.trim(),
        password,
        display_name: displayName.trim() || null,
        is_super_admin: isSuper,
        maintenance_role: role,
        janitor_building_ids: roleNeedsBuildings(role) ? createBuildingIds : null,
      });
      setEmail("");
      setDisplayName("");
      setPassword("");
      setIsSuper(false);
      setCreateRole("");
      setCreateBuildingIds([]);
      setMessage(t("teamCreated"));
      try {
        await load();
      } catch {
        // Account + welcome email already succeeded; list refresh is best-effort.
      }
    } catch (err) {
      setMessage(null);
      setError(formatAdminFetchError(err, locale, t("teamError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className={adminUi.pageTitle}>{t("teamTitle")}</h1>
      <p className={adminUi.pageSubtitle}>{t("teamSubtitleRoles")}</p>

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {message ? <p className={`${adminUi.alertSuccess} mt-4`}>{message}</p> : null}

      <form onSubmit={onCreate} className={`${adminUi.cardPad} ${adminUi.card} mt-6 space-y-4`}>
        <h2 className={adminUi.sectionTitle}>{t("teamAddTitle")}</h2>
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("teamEmail")}
          <input
            type="email"
            required
            placeholder={t("teamEmail")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={adminUi.input}
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("teamDisplayName")}
          <input
            type="text"
            placeholder={t("teamDisplayName")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={adminUi.input}
            disabled={busy}
          />
        </label>
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("teamTempPassword")}
          <input
            type="password"
            required
            minLength={8}
            placeholder={t("teamTempPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={adminUi.input}
            disabled={busy}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--ml-ink)]">
          <input
            type="checkbox"
            checked={isSuper}
            onChange={(e) => setIsSuper(e.target.checked)}
            className="h-4 w-4 rounded border-[var(--ml-line)]"
            disabled={busy}
          />
          {t("teamSuperAdmin")}
        </label>
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("teamMaintenanceRole")}
          <select
            className={adminUi.input}
            value={createRole}
            onChange={(e) => setCreateRole(e.target.value)}
            disabled={busy || isSuper}
          >
            <option value="">{t("teamNoMaintenanceRole")}</option>
            {MAINTENANCE_ROLES.map((r) => (
              <option key={r} value={r}>
                {maintenanceRoleLabel(r, locale)}
              </option>
            ))}
          </select>
        </label>
        {roleNeedsBuildings(createRole) ? (
          <div>
            <p className="text-sm text-[var(--ml-steel)]">{t("teamPaBuildings")}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {buildings.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={createBuildingIds.includes(b.id)}
                    onChange={() =>
                      setCreateBuildingIds((prev) =>
                        prev.includes(b.id)
                          ? prev.filter((id) => id !== b.id)
                          : [...prev, b.id]
                      )
                    }
                    disabled={busy}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}
        <button type="submit" className={adminUi.btnPrimary} disabled={busy}>
          {t("teamCreateSubmit")}
        </button>
      </form>

      <ul className={`${adminUi.list} mt-8 space-y-4`}>
        {users.map((u) => (
          <TeamMemberRow
            key={u.id}
            user={u}
            buildings={buildings}
            t={t}
            locale={locale}
            onChanged={load}
            onError={(msg) => setError(msg)}
          />
        ))}
      </ul>
    </>
  );
}

function TeamMemberRow({
  user,
  buildings,
  t,
  locale,
  onChanged,
  onError,
}: {
  user: AdminUser;
  buildings: BuildingAdmin[];
  t: (key: AdminMessageKey) => string;
  locale: Locale;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [role, setRole] = useState(user.maintenance_role ?? "");
  const [buildingIds, setBuildingIds] = useState<number[]>(
    user.janitor_building_ids ?? []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user.display_name ?? "");
    setRole(user.maintenance_role ?? "");
    setBuildingIds(user.janitor_building_ids ?? []);
  }, [user]);

  const save = async () => {
    setSaving(true);
    try {
      await updateAdminUser(user.id, {
        display_name: displayName.trim() || null,
        maintenance_role: role || null,
        janitor_building_ids: roleNeedsBuildings(role) ? buildingIds : null,
      });
      await onChanged();
    } catch (e) {
      onError(formatAdminFetchError(e, locale, t("teamError")));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!confirm(t("teamDeactivateConfirm").replace("{email}", user.email))) return;
    try {
      await updateAdminUser(user.id, { active: false });
      await onChanged();
    } catch (e) {
      onError(formatAdminFetchError(e, locale, t("teamError")));
    }
  };

  return (
    <li className={`${adminUi.card} ${adminUi.cardPad} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[var(--ml-ink)]">{user.email}</p>
          <p className="text-xs text-[var(--ml-steel)]">
            {user.is_super_admin ? t("teamSuperAdmin") : t("teamAdmin")}
            {user.maintenance_role
              ? ` · ${maintenanceRoleLabel(user.maintenance_role, locale)}`
              : ""}
            {!user.active && ` · ${t("teamInactive")}`}
          </p>
        </div>
        {user.active ? (
          <button
            type="button"
            onClick={() => void deactivate()}
            className={adminUi.btnDanger + " !px-3 !py-1.5 !text-xs"}
          >
            {t("teamDeactivate")}
          </button>
        ) : null}
      </div>
      <label className="block text-sm text-[var(--ml-steel)]">
        {t("teamDisplayName")}
        <input
          type="text"
          className={adminUi.input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={!user.active || saving}
        />
      </label>
      {!user.is_super_admin ? (
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("teamMaintenanceRole")}
          <select
            className={adminUi.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={!user.active || saving}
          >
            <option value="">{t("teamNoMaintenanceRole")}</option>
            {MAINTENANCE_ROLES.map((r) => (
              <option key={r} value={r}>
                {maintenanceRoleLabel(r, locale)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {roleNeedsBuildings(role) ? (
        <div>
          <p className="text-sm text-[var(--ml-steel)]">{t("teamPaBuildings")}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {buildings.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={buildingIds.includes(b.id)}
                  onChange={() =>
                    setBuildingIds((prev) =>
                      prev.includes(b.id)
                        ? prev.filter((id) => id !== b.id)
                        : [...prev, b.id]
                    )
                  }
                  disabled={!user.active || saving}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {user.active ? (
        <button
          type="button"
          className={adminUi.btnPrimary + " self-start"}
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? t("loading") : t("buildingsSave")}
        </button>
      ) : null}
    </li>
  );
}
