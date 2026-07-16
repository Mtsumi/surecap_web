"use client";

import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import {
  BuildingAdmin,
  UnitAdmin,
  listBuildingsAdmin,
  listUnitsAdmin,
  updateUnitAdmin,
} from "@/lib/adminApi";
import type { AdminMessageKey } from "@/lib/adminI18n";

import { adminUi } from "@/lib/adminUi";

const inputClass = adminUi.input + " min-w-0 !px-2 !py-2";

function parseRentDraft(draft: string): number | null | "invalid" {
  const trimmed = draft.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (Number.isNaN(value) || value < 0) return "invalid";
  return value;
}

function rentMatches(unitRent: number | null, draft: string): boolean {
  const parsed = parseRentDraft(draft);
  if (parsed === "invalid") return false;
  return parsed === unitRent;
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="m2.695 14.762-1.262 3.154a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.885L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
    </svg>
  );
}

function ForRentBadge({
  forRent,
  t,
}: {
  forRent: boolean;
  t: (key: AdminMessageKey) => string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
        forRent
          ? "bg-[var(--ml-pine)] text-white"
          : "border border-[var(--ml-line)] text-[var(--ml-steel)]"
      }`}
    >
      {forRent ? t("buildingsForRent") : t("buildingsNotForRent")}
    </span>
  );
}

type UnitRowProps = {
  unit: UnitAdmin;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onUpdated: (unit: UnitAdmin) => void;
  onError: (message: string) => void;
  t: (key: AdminMessageKey) => string;
};

function UnitRow({
  unit,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onUpdated,
  onError,
  t,
}: UnitRowProps) {
  const [rentDraft, setRentDraft] = useState(unit.rent != null ? String(unit.rent) : "");
  const [dateDraft, setDateDraft] = useState(unit.available_date ?? "");
  const [forRentDraft, setForRentDraft] = useState(unit.for_rent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setRentDraft(unit.rent != null ? String(unit.rent) : "");
      setDateDraft(unit.available_date ?? "");
      setForRentDraft(unit.for_rent);
    }
  }, [unit.id, unit.rent, unit.available_date, unit.for_rent, isEditing]);

  const resetDrafts = () => {
    setRentDraft(unit.rent != null ? String(unit.rent) : "");
    setDateDraft(unit.available_date ?? "");
    setForRentDraft(unit.for_rent);
  };

  const handleCancel = () => {
    resetDrafts();
    onCancelEdit();
  };

  const saveDetails = async () => {
    const rent = parseRentDraft(rentDraft);
    if (rent === "invalid") {
      onError(t("buildingsInvalidRent"));
      return;
    }

    const available_date = dateDraft.trim() || null;
    const unchanged =
      rentMatches(unit.rent, rentDraft) &&
      available_date === unit.available_date &&
      forRentDraft === unit.for_rent;

    if (unchanged) {
      onCancelEdit();
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUnitAdmin(unit.id, {
        rent,
        available_date,
        for_rent: forRentDraft,
      });
      onUpdated(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : t("buildingsGenericError"));
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <li className="px-3 py-3 sm:px-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-semibold text-[var(--ml-ink)]">{unit.unit_number}</p>
              <ForRentBadge forRent={unit.for_rent} t={t} />
            </div>
            <dl className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="admin-field-label">{t("buildingsRent")}</dt>
                <dd className="admin-field-value">
                  {unit.rent != null
                    ? `${unit.rent} ${t("buildingsRentSuffix")}`
                    : t("buildingsNotSet")}
                </dd>
              </div>
              <div>
                <dt className="admin-field-label">{t("buildingsAvailableDate")}</dt>
                <dd className="admin-field-value break-words">
                  {unit.available_date || t("buildingsNotSet")}
                </dd>
              </div>
            </dl>
          </div>
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={`${t("buildingsEdit")} ${unit.unit_number}`}
            className={adminUi.btnSecondary + " !p-2"}
          >
            <PencilIcon />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="border-l-2 border-[var(--ml-ink)] bg-[var(--ml-paper)] px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[var(--ml-ink)]">{unit.unit_number}</p>
        <span className="text-xs text-[var(--ml-steel)]">{t("buildingsEdit")}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block admin-field-label">
          {t("buildingsRent")}
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={rentDraft}
            onChange={(e) => setRentDraft(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block admin-field-label">
          {t("buildingsAvailableDate")}
          <input
            type="text"
            value={dateDraft}
            onChange={(e) => setDateDraft(e.target.value)}
            placeholder={t("buildingsAvailablePlaceholder")}
            className={inputClass}
          />
        </label>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[var(--ml-ink)]">
        <input
          type="checkbox"
          checked={forRentDraft}
          onChange={(e) => setForRentDraft(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--ml-line)]"
        />
        {t("buildingsForRent")}
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className={adminUi.btnSecondary + " w-full sm:w-auto"}
        >
          {t("buildingsCancel")}
        </button>
        <button
          type="button"
          onClick={saveDetails}
          disabled={saving}
          className={adminUi.btnPrimary + " w-full sm:w-auto"}
        >
          {saving ? t("buildingsSaving") : t("buildingsSave")}
        </button>
      </div>
    </li>
  );
}

export default function BuildingsAdminPage() {
  const { t } = useAdminLocaleContext();
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [units, setUnits] = useState<UnitAdmin[]>([]);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    listBuildingsAdmin()
      .then((b) => {
        setBuildings(b);
        if (b.length) setSelectedId(b[0].id);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("buildingsGenericError"))
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setEditingUnitId(null);
    setLoadingUnits(true);
    listUnitsAdmin(selectedId)
      .then(setUnits)
      .catch((e) =>
        setError(e instanceof Error ? e.message : t("buildingsGenericError"))
      )
      .finally(() => setLoadingUnits(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleUnitUpdated = (updated: UnitAdmin) => {
    setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    setEditingUnitId(null);
  };

  return (
    <AdminShell>
      <h1 className={adminUi.pageTitle}>{t("buildingsTitle")}</h1>

      {error && <p className={`${adminUi.alertError} mt-4`}>{error}</p>}

      <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {buildings.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setError(null);
              setSelectedId(b.id);
            }}
            className={
              selectedId === b.id ? adminUi.chipActive : adminUi.chip
            }
          >
            {b.name}
          </button>
        ))}
      </div>

      {loadingUnits ? (
        <p className={`${adminUi.empty} mt-6`}>{t("loading")}</p>
      ) : units.length === 0 ? (
        <p className={`${adminUi.empty} mt-6`}>{t("buildingsEmptyUnits")}</p>
      ) : (
        <ul className={`${adminUi.list} mt-6`}>
          {units.map((u) => (
            <UnitRow
              key={u.id}
              unit={u}
              isEditing={editingUnitId === u.id}
              onStartEdit={() => {
                setError(null);
                setEditingUnitId(u.id);
              }}
              onCancelEdit={() => setEditingUnitId(null)}
              onUpdated={handleUnitUpdated}
              onError={setError}
              t={t}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
