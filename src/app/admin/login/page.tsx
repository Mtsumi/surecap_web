"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { adminLogin } from "@/lib/adminApi";
import { setAdminToken } from "@/lib/adminAuth";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import { clearCachedAdminUser } from "../AdminShell";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import LocaleToggle from "@/components/LocaleToggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useAdminLocaleContext();
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
      clearCachedAdminUser();
      setAdminToken(res.access_token);
      if (res.must_change_password) {
        router.replace("/admin/account?required=1");
      } else {
        router.replace("/admin/applications");
      }
    } catch (err) {
      setError(formatAdminFetchError(err, locale, t("loginError")));
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
          <LocaleToggle locale={locale} onChange={setLocale} />
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
