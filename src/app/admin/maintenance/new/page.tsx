"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BuildingAdmin,
  UnitAdmin,
  adminMe,
  createMaintenanceTicket,
  listBuildingsAdmin,
  listUnitsAdmin,
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
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const onPhotosSelected = (files: FileList | null) => {
    if (!files?.length) return;
    setPhotos((prev) => [...prev, ...Array.from(files)]);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || buildingId === "") return;
    setBusy(true);
    setError(null);
    setProgress(t("maintenanceCreateSaving"));
    try {
      const ticket = await createMaintenanceTicket({
        building_id: buildingId,
        location_kind: locationKind,
        category,
        urgent,
        title: title.trim(),
        description: description.trim(),
        ...(locationKind === "unit"
          ? { unit_id: unitId === "" ? null : unitId }
          : { unit_id: null, location_label: locationLabel.trim() }),
      });

      for (let i = 0; i < photos.length; i++) {
        setProgress(
          t("maintenanceCreateUploadingPhoto")
            .replace("{current}", String(i + 1))
            .replace("{total}", String(photos.length))
        );
        try {
          await uploadMaintenanceTicketAttachment(ticket.id, photos[i]);
        } catch (uploadErr) {
          setError(
            `${t("maintenanceCreatePhotoPartial")} ${formatAdminFetchError(
              uploadErr,
              locale,
              t("maintenanceError")
            )}`
          );
          router.push(`/admin/maintenance/${ticket.id}`);
          return;
        }
      }

      router.push(`/admin/maintenance/${ticket.id}`);
    } catch (err) {
      setProgress(null);
      setError(formatAdminFetchError(err, locale, t("maintenanceCreateError")));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

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
            disabled={busy}
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
              disabled={busy}
            />
            {t("maintenanceLocationUnit")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="locationKind"
              checked={locationKind === "common_area"}
              onChange={() => setLocationKind("common_area")}
              disabled={busy}
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
              disabled={busy || buildingId === ""}
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
              disabled={busy}
            />
          </label>
        )}

        <label className="block text-sm text-[var(--ml-steel)]">
          {t("maintenanceFieldCategory")}
          <select
            className={adminUi.input}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
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
            disabled={busy}
          />
        </label>

        <div>
          <p className="text-sm text-[var(--ml-steel)]">{t("maintenanceFieldPhotos")}</p>
          <label className="mt-2 inline-block">
            <span className={adminUi.btnSecondary + " cursor-pointer"}>
              {t("maintenanceUploadPhoto")}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                onPhotosSelected(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {photos.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-[var(--ml-ink)]">
              {photos.map((f, idx) => (
                <li key={`${f.name}-${idx}`}>
                  {f.name} ({Math.round(f.size / 1024)} KB)
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <button type="submit" className={adminUi.btnPrimary} disabled={busy}>
          {busy ? progress || t("maintenanceCreateSaving") : t("maintenanceCreateSubmit")}
        </button>
      </form>
    </>
  );
}
