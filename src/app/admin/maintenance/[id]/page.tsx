"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MaintenanceTicket,
  adminMe,
  getMaintenanceTicket,
  postMaintenanceOwnerDecision,
  uploadMaintenanceTicketAttachment,
} from "@/lib/adminApi";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import {
  maintenanceCategoryLabel,
  maintenanceStatusClass,
  maintenanceStatusLabel,
} from "@/lib/maintenanceAdmin";
import {
  downloadMaintenanceAttachment,
  openMaintenanceAttachmentInline,
} from "@/lib/maintenanceFiles";

function ticketLocation(ticket: MaintenanceTicket): string {
  if (ticket.location_kind === "unit") {
    return ticket.unit_number ? `#${ticket.unit_number}` : "—";
  }
  return ticket.location_label || "—";
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const ticketId = Number(params.id);
  const { t, locale } = useAdminLocaleContext();
  const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
  const [isSuper, setIsSuper] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(ticketId)) {
      setError(t("maintenanceError"));
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getMaintenanceTicket(ticketId), adminMe()])
      .then(([data, user]) => {
        if (cancelled) return;
        setTicket(data);
        setIsSuper(user.is_super_admin);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(formatAdminFetchError(e, locale, t("maintenanceError")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticketId, locale, t]);

  const onDecision = async (decision: "approve" | "decline" | "hold") => {
    if (decisionBusy) return;
    const reasonText = reason.trim();
    if ((decision === "decline" || decision === "hold") && !reasonText) {
      setError(t("maintenanceReasonRequired"));
      return;
    }
    setDecisionBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await postMaintenanceOwnerDecision(ticketId, {
        decision,
        reason: reasonText || null,
      });
      setTicket(updated);
      setMessage(t("maintenanceDecisionSaved"));
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("maintenanceError")));
    } finally {
      setDecisionBusy(false);
    }
  };

  const onPhoto = async (files: FileList | null) => {
    if (!files?.length || uploadBusy) return;
    setUploadBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const updated = await uploadMaintenanceTicketAttachment(ticketId, file);
        setTicket(updated);
      }
    } catch (e) {
      setError(formatAdminFetchError(e, locale, t("maintenanceError")));
    } finally {
      setUploadBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-[var(--ml-steel)]">{t("loading")}</p>;
  }

  if (!ticket) {
    return (
      <>
        <Link href="/admin/maintenance" className={adminUi.link}>
          {t("maintenanceBack")}
        </Link>
        {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      </>
    );
  }

  const showOwnerPanel = isSuper && ticket.status === "pending_owner";

  return (
    <>
      <p className="mb-2">
        <Link href="/admin/maintenance" className={adminUi.link}>
          {t("maintenanceBack")}
        </Link>
      </p>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className={adminUi.pageTitle}>
          {t("maintenanceDetailTitle").replace("{id}", String(ticket.id))}
        </h1>
        <span className={maintenanceStatusClass(ticket.status)}>
          {maintenanceStatusLabel(ticket.status, locale)}
        </span>
      </div>

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {message ? <p className={`${adminUi.alertSuccess} mt-4`}>{message}</p> : null}

      <div className={`${adminUi.card} ${adminUi.cardPad} mt-6 space-y-3`}>
        <p className="text-sm text-[var(--ml-steel)]">
          {ticket.building_name ?? ticket.building_id} · {ticketLocation(ticket)} ·{" "}
          {maintenanceCategoryLabel(ticket.category, locale)}
          {ticket.urgent ? ` · ${t("maintenanceUrgentYes")}` : ""}
        </p>
        <p className="font-semibold text-[var(--ml-ink)]">{ticket.title}</p>
        {ticket.opened_by_email ? (
          <p className="text-xs text-[var(--ml-steel)]">
            {t("maintenanceOpenedBy").replace("{email}", ticket.opened_by_email)}
          </p>
        ) : null}
        {ticket.status_reason ? (
          <p className="text-sm text-[var(--ml-ink)]">
            <span className="text-[var(--ml-steel)]">{t("maintenanceReason")}: </span>
            {ticket.status_reason}
          </p>
        ) : null}
        <div>
          <p className={adminUi.sectionTitle}>{t("maintenanceDescription")}</p>
          <p className="whitespace-pre-wrap text-sm text-[var(--ml-ink)]">
            {ticket.description}
          </p>
        </div>
      </div>

      <div className={`${adminUi.card} ${adminUi.cardPad} mt-6`}>
        <h2 className={adminUi.sectionTitle}>{t("maintenancePhotos")}</h2>
        {ticket.attachments.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm text-[var(--ml-ink)]">
            {ticket.attachments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2">
                <span>
                  {a.original_filename} ({Math.round(a.byte_size / 1024)} KB)
                </span>
                <button
                  type="button"
                  className={adminUi.link}
                  disabled={uploadBusy}
                  onClick={() => {
                    openMaintenanceAttachmentInline(ticket.id, a.id).catch((e) =>
                      setError(formatAdminFetchError(e, locale, t("maintenanceError")))
                    );
                  }}
                >
                  {t("maintenancePhotoView")}
                </button>
                <button
                  type="button"
                  className={adminUi.link}
                  disabled={uploadBusy}
                  onClick={() => {
                    downloadMaintenanceAttachment(ticket.id, a.id, a.original_filename).catch(
                      (e) => setError(formatAdminFetchError(e, locale, t("maintenanceError")))
                    );
                  }}
                >
                  {t("maintenancePhotoDownload")}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--ml-steel)]">—</p>
        )}
        <label className="mt-4 inline-block">
          <span className={adminUi.btnSecondary + " cursor-pointer"}>
            {uploadBusy ? t("maintenanceUploading") : t("maintenanceUploadPhoto")}
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploadBusy}
            onChange={(e) => {
              void onPhoto(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {showOwnerPanel ? (
        <div className={`${adminUi.card} ${adminUi.cardPad} mt-6 space-y-4`}>
          <div>
            <h2 className={adminUi.sectionTitle}>{t("maintenanceOwnerTitle")}</h2>
            <p className="text-sm text-[var(--ml-steel)]">{t("maintenanceOwnerSubtitle")}</p>
          </div>
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("maintenanceOwnerReasonLabel")}
            <textarea
              rows={3}
              className={adminUi.input}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={decisionBusy}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={adminUi.btnPrimary}
              disabled={decisionBusy}
              onClick={() => void onDecision("approve")}
            >
              {t("maintenanceApprove")}
            </button>
            <button
              type="button"
              className={adminUi.btnDanger}
              disabled={decisionBusy}
              onClick={() => void onDecision("decline")}
            >
              {t("maintenanceDecline")}
            </button>
            <button
              type="button"
              className={adminUi.btnSecondary}
              disabled={decisionBusy}
              onClick={() => void onDecision("hold")}
            >
              {t("maintenanceHold")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
