"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  AdminUser,
  createAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
import { useAdminLocaleContext } from "../AdminLocaleContext";

export default function TeamPage() {
  const { t } = useAdminLocaleContext();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSuper, setIsSuper] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setUsers(await listAdminUsers());
  };

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : t("teamError")));
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
        is_super_admin: isSuper,
      });
      setEmail("");
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
      setError(err instanceof Error ? err.message : t("teamError"));
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (user: AdminUser) => {
    if (!confirm(t("teamDeactivateConfirm").replace("{email}", user.email))) return;
    try {
      setError(null);
      await updateAdminUser(user.id, { active: false });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("teamError"));
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

      <ul className={`${adminUi.list} mt-8`}>
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 !py-4">
            <div>
              <p className="font-semibold text-[var(--ml-ink)]">{u.email}</p>
              <p className="text-xs text-[var(--ml-steel)]">
                {u.is_super_admin ? t("teamSuperAdmin") : t("teamAdmin")}
                {!u.active && ` · ${t("teamInactive")}`}
              </p>
            </div>
            {u.active && (
              <button
                type="button"
                onClick={() => deactivate(u)}
                className={adminUi.btnDanger + " !px-3 !py-1.5 !text-xs"}
              >
                {t("teamDeactivate")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
