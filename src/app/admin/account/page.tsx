"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { changeAdminPassword } from "@/lib/adminApi";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";

function AccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAdminLocaleContext();
  const required = searchParams.get("required") === "1";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(t("accountTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("accountMismatch"));
      return;
    }

    setLoading(true);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      router.replace("/admin/applications");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("accountGenericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {required && <p className={`${adminUi.alertWarn} mt-4`}>{t("accountRequiredBanner")}</p>}

      {error && <p className={`${adminUi.alertError} mt-4`}>{error}</p>}

      <form onSubmit={onSubmit} className={`${adminUi.cardPad} ${adminUi.card} mt-6 max-w-md space-y-4`}>
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("accountCurrentPassword")}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={adminUi.input}
          />
        </label>
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("accountNewPassword")}
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={adminUi.input}
          />
        </label>
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("accountConfirmPassword")}
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={adminUi.input}
          />
        </label>
        <button type="submit" disabled={loading} className={adminUi.btnPrimary}>
          {loading ? t("accountSubmitting") : t("accountSubmit")}
        </button>
      </form>
    </>
  );
}

export default function AdminAccountPage() {
  const { t } = useAdminLocaleContext();

  return (
    <>
      <h1 className={adminUi.pageTitle}>{t("accountTitle")}</h1>
      <p className={adminUi.pageSubtitle}>{t("accountSubtitle")}</p>

      <Suspense fallback={<p className={`${adminUi.empty} mt-6`}>{t("loading")}</p>}>
        <AccountForm />
      </Suspense>
    </>
  );
}
