"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AdminNotification,
  listAdminNotifications,
  markAdminNotificationRead,
} from "@/lib/adminApi";
import { notificationHref } from "@/lib/notificationHref";
import { useAdminLocaleContext } from "./AdminLocaleContext";

export default function NotificationBell() {
  const { t } = useAdminLocaleContext();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AdminNotification[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listAdminNotifications({ limit: 5 });
      setUnread(data.unread_count);
      setItems(data.items);
    } catch {
      /* stay quiet in header */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onOpenItem = async (item: AdminNotification) => {
    setOpen(false);
    if (!item.read_at) {
      try {
        await markAdminNotificationRead(item.id);
        setUnread((n) => Math.max(0, n - 1));
      } catch {
        /* navigate anyway */
      }
    }
    router.push(notificationHref(item));
  };

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button
        type="button"
        className="relative shrink-0 rounded-md border border-[var(--ml-line)] px-2 py-1.5 text-xs text-[var(--ml-ink)] sm:px-2.5"
        aria-label={t("notificationsTitle")}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
      >
        {t("notificationsBell")}
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 min-w-[1.1rem] rounded-full bg-[var(--ml-brick)] px-1 text-center text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          role="menu"
          className="fixed left-3 right-3 z-50 mt-0 max-h-[min(70vh,24rem)] overflow-y-auto rounded-lg border border-[var(--ml-line)] bg-[var(--ml-card)] shadow-lg top-[3.75rem] md:absolute md:left-auto md:right-0 md:top-auto md:mt-1 md:w-80 md:max-h-[min(70vh,28rem)]"
        >
          <p className="sticky top-0 border-b border-[var(--ml-line)] bg-[var(--ml-card)] px-3 py-2 text-xs font-semibold text-[var(--ml-ink)]">
            {t("notificationsTitle")}
          </p>
          {items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--ml-steel)]">{t("notificationsEmpty")}</p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2.5 text-left hover:bg-[var(--ml-paper)]"
                    onClick={() => void onOpenItem(item)}
                  >
                    <span
                      className={`block break-words text-sm ${item.read_at ? "font-normal text-[var(--ml-steel)]" : "font-semibold text-[var(--ml-ink)]"}`}
                    >
                      {item.title}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block break-words text-xs text-[var(--ml-steel)]">
                      {item.body}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/notifications"
            className="sticky bottom-0 block border-t border-[var(--ml-line)] bg-[var(--ml-card)] px-3 py-2.5 text-center text-xs font-semibold text-[var(--ml-brick)]"
            onClick={() => setOpen(false)}
          >
            {t("notificationsSeeAll")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
