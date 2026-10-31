"use client";

import { useEffect, useRef, useState } from "react";
import type { MaintenanceTicket } from "@/lib/adminApi";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import type { AdminMessageKey } from "@/lib/adminI18n";
import {
  downloadMaintenanceAttachment,
  fetchMaintenanceAttachmentBlob,
  openMaintenanceAttachmentInline,
} from "@/lib/maintenanceFiles";

type Attachment = MaintenanceTicket["attachments"][number];

type Props = {
  ticketId: number;
  attachment: Attachment;
  disabled?: boolean;
  locale: "en" | "fr";
  onError: (message: string) => void;
  t: (key: AdminMessageKey) => string;
};

export default function MaintenanceAttachmentThumb({
  ticketId,
  attachment,
  disabled,
  locale,
  onError,
  t,
}: Props) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      try {
        const blob = await fetchMaintenanceAttachmentBlob(ticketId, attachment.id, "inline");
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setThumbUrl(objectUrl);
      } catch (e) {
        if (!cancelled) {
          setThumbUrl(null);
          onErrorRef.current(formatAdminFetchError(e, locale, t("maintenanceError")));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, locale, t, ticketId]);

  const onView = () => {
    openMaintenanceAttachmentInline(ticketId, attachment.id).catch((e) =>
      onError(formatAdminFetchError(e, locale, t("maintenanceError")))
    );
  };

  const onDownload = () => {
    downloadMaintenanceAttachment(ticketId, attachment.id, attachment.original_filename).catch(
      (e) => onError(formatAdminFetchError(e, locale, t("maintenanceError")))
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled || loading || !thumbUrl}
        onClick={() => void onView()}
        className="group relative aspect-square w-full overflow-hidden rounded-lg border border-[var(--ml-line)] bg-[var(--ml-paper)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ml-brick)]"
        aria-label={`${t("maintenancePhotoView")}: ${attachment.original_filename}`}
      >
        {loading ? (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-[var(--ml-steel)]">
            …
          </span>
        ) : thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover transition group-hover:opacity-90"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-[var(--ml-steel)]">
            {attachment.original_filename}
          </span>
        )}
      </button>
      <p className="truncate text-xs text-[var(--ml-steel)]" title={attachment.original_filename}>
        {attachment.original_filename} ({Math.round(attachment.byte_size / 1024)} KB)
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <button
          type="button"
          className={adminUi.link}
          disabled={disabled}
          onClick={() => void onView()}
        >
          {t("maintenancePhotoView")}
        </button>
        <button
          type="button"
          className={adminUi.link}
          disabled={disabled}
          onClick={() => void onDownload()}
        >
          {t("maintenancePhotoDownload")}
        </button>
      </div>
    </div>
  );
}
