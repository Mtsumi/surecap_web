"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { changeAdminPassword } from "@/lib/adminApi";
import AdminShell from "../AdminShell";
import { useAdminLocaleContext } from "../AdminLocaleContext";

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

  const inputClass =
    "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3d5a45]";

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
      {required && (
        <p className="mt-4 rounded border border-[#e7d9b8] bg-[#fff8e8] px-3 py-2 text-sm text-[#57534e]">
          {t("accountRequiredBanner")}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-4">
        <label className="block text-sm text-[#57534e]">
          {t("accountCurrentPassword")}
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>
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
          className="rounded bg-[#3d5a45] px-4 py-2.5 text-sm font-medium text-[#f4f1ec] disabled:opacity-60"
        >
          {loading ? t("accountSubmitting") : t("accountSubmit")}
        </button>
      </form>
    </>
  );
}

export default function AdminAccountPage() {
  const { t } = useAdminLocaleContext();

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-[#292524]">{t("accountTitle")}</h1>
      <p className="mt-1 text-sm text-[#78716c]">{t("accountSubtitle")}</p>

      <Suspense fallback={<p className="mt-6 text-sm text-[#78716c]">{t("loading")}</p>}>
        <AccountForm />
      </Suspense>
    </AdminShell>
  );
}
