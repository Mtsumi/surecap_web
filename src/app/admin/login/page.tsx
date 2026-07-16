"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { adminLogin } from "@/lib/adminApi";
import { setAdminToken } from "@/lib/adminAuth";
import { adminUi } from "@/lib/adminUi";
import { useAdminLocaleContext } from "../AdminLocaleContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, toggleLocale } = useAdminLocaleContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogin(email.trim(), password);
      setAdminToken(res.access_token);
      if (res.must_change_password) {
        router.replace("/admin/account?required=1");
      } else {
        router.replace("/admin/applications");
      }
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
            <h1 className={adminUi.pageTitle}>{t("loginTitle")}</h1>
            <p className={adminUi.pageSubtitle}>{t("loginSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 text-sm text-[var(--ml-steel)] hover:underline"
          >
            {t("langToggle")}
          </button>
        </div>

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
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("loginPassword")}
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={adminUi.input}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className={adminUi.btnPrimary + " w-full !py-3"}
          >
            {loading ? t("loginSubmitting") : t("loginSubmit")}
          </button>
          <p className="text-center text-sm">
            <Link href="/admin/forgot-password" className={adminUi.link}>
              {t("loginForgotPassword")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
