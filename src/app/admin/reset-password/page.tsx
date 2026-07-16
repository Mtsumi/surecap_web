"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/adminApi";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAdminLocaleContext();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="admin-auth-card">
        <p className={adminUi.alertWarn}>{t("resetMissingToken")}</p>
        <p className="text-center text-sm">
          <Link href="/admin/forgot-password" className={adminUi.link}>
            {t("forgotTitle")}
          </Link>
        </p>
      </div>
    );
  }

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
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch {
      setError(t("resetInvalidToken"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="admin-auth-card space-y-4">
        <p className={adminUi.alertSuccess}>{t("resetSuccess")}</p>
        <button
          type="button"
          onClick={() => router.replace("/admin/login")}
          className={adminUi.btnPrimary + " w-full !py-3"}
        >
          {t("loginSubmit")}
        </button>
      </div>
    );
  }

  return (
    <>
      {error && <p className={`${adminUi.alertError} mt-4`}>{error}</p>}

      <form onSubmit={onSubmit} className="admin-auth-card">
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
        <button type="submit" disabled={loading} className={adminUi.btnPrimary + " w-full !py-3"}>
          {loading ? t("resetSubmitting") : t("resetSubmit")}
        </button>
      </form>
    </>
  );
}

export default function AdminResetPasswordPage() {
  const { t, toggleLocale } = useAdminLocaleContext();

  return (
    <main className="admin-auth-page">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ml-steel)]">
              {t("slogan")}
            </p>
            <h1 className={adminUi.pageTitle}>{t("resetTitle")}</h1>
            <p className={adminUi.pageSubtitle}>{t("resetSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 text-sm text-[var(--ml-steel)] hover:underline"
          >
            {t("langToggle")}
          </button>
        </div>

        <Suspense fallback={<p className={`${adminUi.empty} mt-6`}>{t("loading")}</p>}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-6 text-center text-sm">
          <Link href="/admin/login" className={adminUi.link}>
            {t("forgotBackToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
