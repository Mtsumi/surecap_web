"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { requestPasswordReset } from "@/lib/adminApi";
import { useAdminLocaleContext } from "../AdminLocaleContext";

export default function AdminForgotPasswordPage() {
  const { t, toggleLocale } = useAdminLocaleContext();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputClass =
    "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3d5a45]";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#292524]">{t("forgotTitle")}</h1>
          <p className="mt-1 text-sm text-[#57534e]">{t("forgotSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          className="shrink-0 text-sm text-[#78716c] hover:underline"
        >
          {t("langToggle")}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded border border-[#d6e8d6] bg-[#f6faf6] px-3 py-2 text-sm text-[#1a3d22]">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm text-[#57534e]">
          {t("loginEmail")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-[#3d5a45] py-3 text-sm font-medium text-[#f4f1ec] disabled:opacity-60"
        >
          {loading ? t("forgotSubmitting") : t("forgotSubmit")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/admin/login" className="text-[#3d5a45] hover:underline">
          {t("forgotBackToLogin")}
        </Link>
      </p>
    </main>
  );
}
