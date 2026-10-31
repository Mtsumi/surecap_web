"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BuildingAdmin,
  UnitAdmin,
  adminMe,
  createMaintenanceDraft,
  deleteMaintenanceDraft,
  listBuildingsAdmin,
  listUnitsAdmin,
  submitMaintenanceTicket,
  uploadMaintenanceTicketAttachment,
} from "@/lib/adminApi";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import {
  DEFAULT_MAINTENANCE_CATEGORY,
  MAINTENANCE_CATEGORY_GROUPS,
  buildingsForMaintenanceUser,
  maintenanceCategoryLabel,
} from "@/lib/maintenanceAdmin";
import MaintenancePhotoInputs from "../MaintenancePhotoInputs";

type PhotoRow = {
  key: string;
  name: string;
  size: number;
  status: "uploading" | "done" | "error";
  error?: string;
};

export default function MaintenanceNewPage() {
  const router = useRouter();
  const { t, locale } = useAdminLocaleContext();
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);
  const [units, setUnits] = useState<UnitAdmin[]>([]);
  const [buildingId, setBuildingId] = useState<number | "">("");
  const [locationKind, setLocationKind] = useState<"unit" | "common_area">("unit");
  const [unitId, setUnitId] = useState<number | "">("");
  const [locationLabel, setLocationLabel] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_MAINTENANCE_CATEGORY);
  const [urgent, setUrgent] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [draftTicketId, setDraftTicketId] = useState<number | null>(null);
  const [photoRows, setPhotoRows] = useState<PhotoRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draftTicketIdRef = useRef<number | null>(null);

  draftTicketIdRef.current = draftTicketId;

  const locationReady = useMemo(() => {
    if (buildingId === "") return false;
    if (locationKind === "unit") return unitId !== "";
    return locationLabel.trim().length > 0;
  }, [buildingId, locationKind, unitId, locationLabel]);

  useEffect(() => {
    adminMe()
      .then((user) => listBuildingsAdmin().then((all) => setBuildings(buildingsForMaintenanceUser(user, all))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (buildingId === "") {
      setUnits([]);
      setUnitId("");
      return;
    }
    let cancelled = false;
    listUnitsAdmin(buildingId)
      .then((data) => {
        if (cancelled) return;
        setUnits(data.filter((u) => u.active));
        setUnitId("");
      })
      .catch(() => {
        if (!cancelled) setUnits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [buildingId]);

  useEffect(() => {
    const oldId = draftTicketIdRef.current;
    setDraftTicketId(null);
    setPhotoRows([]);
    if (oldId != null) {
      deleteMaintenanceDraft(oldId).catch(() => {});
    }
  }, [buildingId, locationKind, unitId, locationLabel]);

  const draftPayload = useCallback(() => {
    if (buildingId === "") throw new Error("building");
    return {
      building_id: buildingId,
      location_kind: locationKind,
      ...(locationKind === "unit"
        ? { unit_id: unitId === "" ? null : unitId }
        : { unit_id: null, location_label: locationLabel.trim() }),
    };
  }, [buildingId, locationKind, unitId, locationLabel]);

  const ensureDraft = useCallback(async (): Promise<number> => {
    if (draftTicketIdRef.current != null) return draftTicketIdRef.current;
    if (!locationReady) {
      throw new Error(t("maintenancePhotosNeedLocation"));
    }
    const ticket = await createMaintenanceDraft(draftPayload());
    setDraftTicketId(ticket.id);
    return ticket.id;
  }, [draftPayload, locationReady, t]);

  const onPhotosSelected = async (files: File[]) => {
    if (!files.length || busy || uploadBusy) return;
    if (!locationReady) {
      setError(t("maintenancePhotosNeedLocation"));
      return;
    }
    setError(null);
    setUploadBusy(true);
    try {
      const ticketId = await ensureDraft();
      for (const file of files) {
        const key = `${file.name}-${file.size}-${crypto.randomUUID()}`;
        setPhotoRows((prev) => [
          ...prev,
          { key, name: file.name, size: file.size, status: "uploading" },
        ]);
        setProgress(t("maintenancePhotoUploading").replace("{name}", file.name));
        try {
          await uploadMaintenanceTicketAttachment(ticketId, file);
          setPhotoRows((prev) =>
            prev.map((row) => (row.key === key ? { ...row, status: "done" } : row))
          );
        } catch (uploadErr) {
          const msg = formatAdminFetchError(uploadErr, locale, t("maintenanceError"));
          setPhotoRows((prev) =>
            prev.map((row) =>
              row.key === key ? { ...row, status: "error", error: msg } : row
            )
          );
          setError(msg);
        }
      }
    } catch (err) {
      setError(formatAdminFetchError(err, locale, t("maintenanceCreateError")));
    } finally {
      setUploadBusy(false);
      setProgress(null);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || uploadBusy || buildingId === "") return;
    const uploadsPending = photoRows.some((r) => r.status === "uploading");
    if (uploadsPending) return;

    setBusy(true);
    setError(null);
    setProgress(t("maintenanceCreateSaving"));
    try {
      const ticketId = await ensureDraft();
      await submitMaintenanceTicket(ticketId, {
        category,
        urgent,
        title: title.trim(),
        description: description.trim(),
      });
      setDraftTicketId(null);
      router.push(`/admin/maintenance/${ticketId}`);
    } catch (err) {
      setProgress(null);
      setError(formatAdminFetchError(err, locale, t("maintenanceCreateError")));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const formDisabled = busy || uploadBusy;
  const hasUploadErrors = photoRows.some((r) => r.status === "error");

  return (
    <>
      <p className="mb-2">
        <Link href="/admin/maintenance" className={adminUi.link}>
          {t("maintenanceBack")}
        </Link>
      </p>
      <h1 className={adminUi.pageTitle}>{t("maintenanceCreateTitle")}</h1>

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}
      {progress ? (
        <p className="mt-4 text-sm text-[var(--ml-steel)]">{progress}</p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className={`${adminUi.card} ${adminUi.cardPad} mt-6 max-w-xl space-y-4`}
      >
        <label className="block text-sm text-[var(--ml-steel)]">
          {t("maintenanceFieldBuilding")}
          <select
            required
            className={adminUi.input}
            value={buildingId}
            onChange={(e) =>
              setBuildingId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={formDisabled}
          >
            <option value="">{t("maintenanceSelectBuilding")}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm text-[var(--ml-steel)]">
            {t("maintenanceFieldLocationKind")}
          </legend>
          <label className="mr-4 inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="locationKind"
              checked={locationKind === "unit"}
              onChange={() => setLocationKind("unit")}
              disabled={formDisabled}
            />
            {t("maintenanceLocationUnit")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="locationKind"
              checked={locationKind === "common_area"}
              onChange={() => setLocationKind("common_area")}
              disabled={formDisabled}
            />
            {t("maintenanceLocationCommon")}
          </label>
        </fieldset>

        {locationKind === "unit" ? (
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("maintenanceFieldUnit")}
            <select
              required
              className={adminUi.input}
              value={unitId}
              onChange={(e) =>
                setUnitId(e.target.value ? Number(e.target.value) : "")
              }
              disabled={formDisabled || buildingId === ""}
            >
              <option value="">{t("maintenanceSelectUnit")}</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  #{u.unit_number}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="block text-sm text-[var(--ml-steel)]">
            {t("maintenanceFieldLocationLabel")}
            <input
              required
              maxLength={120}
              className={adminUi.input}
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              disabled={formDisabled}
            />
          </label>
        )}

        <label className="block text-sm text-[var(--ml-steel)]">
          {t("maintenanceFieldCategory")}
          <select
            className={adminUi.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={formDisabled}
          >
            {MAINTENANCE_CATEGORY_GROUPS.map((group) => (
              <optgroup key={group.groupKey} label={t(group.groupKey)}>
                {group.categories.map((c) => (
                  <option key={c} value={c}>
                    {maintenanceCategoryLabel(c, locale)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-[var(--ml-ink)]">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            disabled={formDisabled}
          />
          {t("maintenanceFieldUrgent")}
        </label>

        <label className="block text-sm text-[var(--ml-steel)]">
          {t("maintenanceFieldTitle")}
          <input
            required
            maxLength={200}
            className={adminUi.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={formDisabled}
          />
        </label>

        <label className="block text-sm text-[var(--ml-steel)]">
          {t("maintenanceFieldDescription")}
          <textarea
            required
            rows={5}
            className={adminUi.input}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={formDisabled}
          />
        </label>

        <div>
          <p className="text-sm text-[var(--ml-steel)]">{t("maintenanceFieldPhotos")}</p>
          <p className="mt-1 text-xs text-[var(--ml-steel)]">
            {t("maintenancePhotosUploadHint")}
          </p>
          <MaintenancePhotoInputs
            disabled={formDisabled || !locationReady}
            onFiles={(files) => {
              void onPhotosSelected(files);
            }}
            t={t}
          />
          {!locationReady ? (
            <p className="mt-2 text-xs text-[var(--ml-steel)]">
              {t("maintenancePhotosNeedLocation")}
            </p>
          ) : null}
          {photoRows.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-[var(--ml-ink)]">
              {photoRows.map((row) => (
                <li key={row.key}>
                  {row.name} ({Math.round(row.size / 1024)} KB)
                  {row.status === "uploading" ? ` — ${t("maintenancePhotoUploadingShort")}` : null}
                  {row.status === "done" ? ` — ${t("maintenancePhotoUploaded")}` : null}
                  {row.status === "error" ? ` — ${row.error ?? t("maintenanceError")}` : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button
          type="submit"
          className={adminUi.btnPrimary}
          disabled={formDisabled || hasUploadErrors}
        >
          {busy ? progress || t("maintenanceCreateSaving") : t("maintenanceCreateSubmit")}
        </button>
      </form>
    </>
  );
}
