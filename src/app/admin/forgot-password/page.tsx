"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/adminApi";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";

export default function AdminForgotPasswordPage() {
  const { t, toggleLocale } = useAdminLocaleContext();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(email.trim());
      setMessage(t("forgotSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-auth-page">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ml-steel)]">
              {t("slogan")}
            </p>
            <h1 className={adminUi.pageTitle}>{t("forgotTitle")}</h1>
            <p className={adminUi.pageSubtitle}>{t("forgotSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 text-sm text-[var(--ml-steel)] hover:underline"
          >
            {t("langToggle")}
          </button>
        </div>

        {message && <p className={`${adminUi.alertSuccess} mt-4`}>{message}</p>}
        {error && <p className={`${adminUi.alertError} mt-4`}>{error}</p>}

        <form onSubmit={onSubmit} className="admin-auth-card">
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("loginEmail")}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={adminUi.input}
            />
          </label>
          <button type="submit" disabled={loading} className={adminUi.btnPrimary + " w-full !py-3"}>
            {loading ? t("forgotSubmitting") : t("forgotSubmit")}
          </button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link href="/admin/login" className={adminUi.link}>
            {t("forgotBackToLogin")}
          </Link>
        </p>
      </div>
    </main>
  );
}
