"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AdminUser,
  createAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import { useAdminLocaleContext } from "../AdminLocaleContext";

export default function TeamPage() {
  const { t, locale } = useAdminLocaleContext();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setUsers(await listAdminUsers());
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
      await createAdminUser({
        email: email.trim(),
        password,
        display_name: displayName.trim() || null,
        is_super_admin: isSuper,
      });
      setEmail("");
      setDisplayName("");
      setPassword("");
      setIsSuper(false);
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
      <p className={adminUi.pageSubtitle}>{t("teamSubtitle")}</p>

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
        <button type="submit" className={adminUi.btnPrimary} disabled={busy}>
          {t("teamCreateSubmit")}
        </button>
      </form>

      <ul className={`${adminUi.list} mt-8 space-y-4`}>
        {users.map((u) => (
          <TeamMemberRow
            key={u.id}
            user={u}
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
  t,
  locale,
  onChanged,
  onError,
}: {
  user: AdminUser;
  t: (key: import("@/lib/adminI18n").AdminMessageKey) => string;
  locale: import("@/lib/i18n").Locale;
  onChanged: () => Promise<void>;
  onError: (msg: string) => void;
}) {
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(user.display_name ?? "");
  }, [user]);

  const saveName = async () => {
    setSaving(true);
    try {
      await updateAdminUser(user.id, { display_name: displayName.trim() || null });
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
            {!user.active && ` · ${t("teamInactive")}`}
          </p>
        </div>
        {user.active && (
          <button
            type="button"
            onClick={() => void deactivate()}
            className={adminUi.btnDanger + " !px-3 !py-1.5 !text-xs"}
          >
            {t("teamDeactivate")}
          </button>
        )}
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
      {user.active ? (
        <button
          type="button"
          className={adminUi.btnPrimary + " self-start"}
          disabled={saving}
          onClick={() => void saveName()}
        >
          {saving ? t("loading") : t("buildingsSave")}
        </button>
      ) : null}
    </li>
  );
}
