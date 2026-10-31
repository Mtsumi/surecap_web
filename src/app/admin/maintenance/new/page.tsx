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
} from "@/lib/adminApi";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import { formatAdminFetchError } from "@/lib/adminFetchError";
import {
  MAINTENANCE_CATEGORIES,
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
  const [category, setCategory] = useState<string>(MAINTENANCE_CATEGORIES[0]);
  const [urgent, setUrgent] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
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

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || buildingId === "") return;
    setBusy(true);
    setError(null);
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
      router.push(`/admin/maintenance/${ticket.id}`);
    } catch (err) {
      setError(formatAdminFetchError(err, locale, t("maintenanceCreateError")));
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
      <h1 className={adminUi.pageTitle}>{t("maintenanceCreateTitle")}</h1>

      {error ? <p className={`${adminUi.alertError} mt-4`}>{error}</p> : null}

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
            {MAINTENANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {maintenanceCategoryLabel(c, locale)}
              </option>
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

        <button type="submit" className={adminUi.btnPrimary} disabled={busy}>
          {t("maintenanceCreateSubmit")}
        </button>
      </form>
    </>
  );
}
