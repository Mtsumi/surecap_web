"use client";

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
    "mt-1 w-full rounded border border-[#e7e0d5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#3d5a45]";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#292524]">{t("loginTitle")}</h1>
          <p className="mt-1 text-sm text-[#57534e]">{t("loginSubtitle")}</p>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          className="shrink-0 text-sm text-[#78716c] hover:underline"
        >
          {t("langToggle")}
        </button>
      </div>

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
        <label className="block text-sm text-[#57534e]">
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
          className="w-full rounded bg-[#3d5a45] py-3 text-sm font-medium text-[#f4f1ec] disabled:opacity-60"
        >
          {loading ? t("loginSubmitting") : t("loginSubmit")}
        </button>
      </form>
    </main>
  );
}
