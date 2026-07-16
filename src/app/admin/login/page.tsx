"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { adminLogin } from "@/lib/adminApi";
import { setAdminToken } from "@/lib/adminAuth";
import { useAdminLocaleContext } from "../AdminLocaleContext";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, toggleLocale } = useAdminLocaleContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-lg border border-[var(--ml-line)] bg-[var(--ml-card)] px-3 py-2.5 text-sm text-[var(--ml-ink)] outline-none focus:border-[var(--ml-ink)]";

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
    <main className="admin-app flex min-h-screen flex-col justify-center bg-[var(--ml-paper)] px-5">
      <div className="mx-auto w-full max-w-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--ml-steel)]">
              {t("slogan")}
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-admin-display)] text-2xl font-extrabold tracking-[0.02em] text-[var(--ml-ink)]">
              {t("loginTitle")}
            </h1>
            <p className="mt-1 text-sm text-[var(--ml-steel)]">{t("loginSubtitle")}</p>
          </div>
          <button
            type="button"
            onClick={toggleLocale}
            className="shrink-0 text-sm text-[var(--ml-steel)] hover:underline"
          >
            {t("langToggle")}
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
            {error}
          </p>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-6 space-y-4 rounded-xl border border-[var(--ml-line)] bg-[var(--ml-card)] p-5"
        >
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("loginEmail")}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("loginPassword")}
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[var(--ml-ink)] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? t("loginSubmitting") : t("loginSubmit")}
          </button>
          <p className="text-center text-sm">
            <Link
              href="/admin/forgot-password"
              className="text-[var(--ml-brick)] hover:underline"
            >
              {t("loginForgotPassword")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
