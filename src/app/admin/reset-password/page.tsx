"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/lib/adminApi";
import { useAdminLocaleContext } from "../AdminLocaleContext";

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

  const inputClass =
    "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3d5a45]";

  if (!token) {
    return (
      <div className="mt-6">
        <p className="rounded border border-[#e7d9b8] bg-[#fff8e8] px-3 py-2 text-sm text-[#57534e]">
          {t("resetMissingToken")}
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/admin/forgot-password" className="text-[#3d5a45] hover:underline">
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
      <div className="mt-6 space-y-4">
        <p className="rounded border border-[#d6e8d6] bg-[#f6faf6] px-3 py-2 text-sm text-[#1a3d22]">
          {t("resetSuccess")}
        </p>
        <button
          type="button"
          onClick={() => router.replace("/admin/login")}
          className="w-full rounded bg-[#3d5a45] py-3 text-sm font-medium text-[#f4f1ec]"
        >
          {t("loginSubmit")}
        </button>
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm text-[#57534e]">
          {t("accountNewPassword")}
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block text-sm text-[#57534e]">
          {t("accountConfirmPassword")}
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-[#3d5a45] py-3 text-sm font-medium text-[#f4f1ec] disabled:opacity-60"
        >
          {loading ? t("resetSubmitting") : t("resetSubmit")}
        </button>
      </form>
    </>
  );
}

export default function AdminResetPasswordPage() {
  const { t, toggleLocale } = useAdminLocaleContext();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#292524]">{t("resetTitle")}</h1>
          <p className="mt-1 text-sm text-[#57534e]">{t("resetSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          className="shrink-0 text-sm text-[#78716c] hover:underline"
        >
          {t("langToggle")}
        </button>
      </div>

      <Suspense fallback={<p className="mt-6 text-sm text-[#78716c]">{t("loading")}</p>}>
        <ResetPasswordForm />
      </Suspense>

      <p className="mt-6 text-center text-sm">
        <Link href="/admin/login" className="text-[#3d5a45] hover:underline">
          {t("forgotBackToLogin")}
        </Link>
      </p>
    </main>
  );
}
