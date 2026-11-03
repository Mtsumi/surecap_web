"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getMaintenanceNotifySettings,
  putMaintenanceNotifySettings,
} from "@/lib/adminApi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import { adminUi } from "@/lib/adminUi";
import { useAdminLocaleContext } from "../../AdminLocaleContext";

export default function MaintenanceNotifySettingsPage() {
  const { t, locale } = useAdminLocaleContext();
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getMaintenanceNotifySettings()
      .then((data) => {
        setText(data.emails.join("\n"));
        setSource(data.source);
      })
      .catch((e) => setError(formatAdminFetchError(e, locale, t("maintenanceError"))));
  }, [locale, t]);

  const onSave = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const emails = text
        .split(/[\n,]+/)
        .map((e) => e.trim())
        .filter(Boolean);
      const saved = await putMaintenanceNotifySettings(emails);
      setText(saved.emails.join("\n"));
      setSource(saved.source);
      setMessage(t("maintenanceStaffSaved"));
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("maintenanceError")));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="mb-2">
        <Link href="/admin/maintenance" className={adminUi.link}>
          {t("maintenanceBack")}
        </Link>
      </p>
      <h1 className={adminUi.pageTitle}>{t("maintenanceNotifySettingsTitle")}</h1>
      <p className={`${adminUi.pageSubtitle} mt-2`}>{t("maintenanceNotifySettingsHint")}</p>
      {source ? (
        <p className="mt-2 text-xs text-[var(--ml-steel)]">
          {t("maintenanceNotifySettingsSource").replace("{source}", source)}
        </p>
      ) : null}
      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {message ? <p className={`${adminUi.alertSuccess} mt-4`}>{message}</p> : null}
      <label className="mt-6 block text-sm text-[var(--ml-steel)]">
        {t("maintenanceNotifySettingsEmails")}
        <textarea
          className={adminUi.input + " mt-1 min-h-[8rem]"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
        />
      </label>
      <button
        type="button"
        className={`${adminUi.btnPrimary} mt-4`}
        disabled={busy}
        onClick={() => void onSave()}
      >
        {t("buildingsSave")}
      </button>
    </>
  );
}
