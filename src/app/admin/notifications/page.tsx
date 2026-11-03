"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminNotification,
  listAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "@/lib/adminApi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import { notificationHref } from "@/lib/notificationHref";
import { adminUi } from "@/lib/adminUi";
import { useAdminLocaleContext } from "../AdminLocaleContext";

export default function AdminNotificationsPage() {
  const { t, locale } = useAdminLocaleContext();
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminNotifications({ limit: 100 });
      setItems(data.items);
      setUnread(data.unread_count);
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("maintenanceError")));
    } finally {
      setLoading(false);
    }
  }, [locale, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onOpen = async (item: AdminNotification) => {
    if (!item.read_at) {
      try {
        await markAdminNotificationRead(item.id);
      } catch {
        /* still navigate */
      }
    }
  };

  const onMarkAll = async () => {
    try {
      await markAllAdminNotificationsRead();
      await load();
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("maintenanceError")));
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={adminUi.pageTitle}>{t("notificationsTitle")}</h1>
          {unread > 0 ? (
            <p className={adminUi.pageSubtitle}>{unread}</p>
          ) : null}
        </div>
        <button type="button" className={adminUi.btnSecondary} onClick={() => void onMarkAll()}>
          {t("notificationsMarkAll")}
        </button>
      </div>
      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {loading ? (
        <p className="mt-6 text-sm text-[var(--ml-steel)]">{t("loading")}</p>
      ) : items.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--ml-steel)]">{t("notificationsEmpty")}</p>
      ) : (
        <ul className={`${adminUi.list} mt-6`}>
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={notificationHref(item)}
                className="block py-4"
                onClick={() => void onOpen(item)}
              >
                <p
                  className={
                    item.read_at
                      ? "text-sm text-[var(--ml-steel)]"
                      : "font-semibold text-[var(--ml-ink)]"
                  }
                >
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-[var(--ml-steel)]">{item.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
