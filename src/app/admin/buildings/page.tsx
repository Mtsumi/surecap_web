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

const inputClass =
  "w-full min-w-0 rounded border border-[#e7e0d5] bg-white px-2 py-1.5 text-sm outline-none focus:border-[#3d5a45]";

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

type UnitRowProps = {
  unit: UnitAdmin;
  onUpdated: (unit: UnitAdmin) => void;
  onError: (message: string) => void;
  t: (key: AdminMessageKey) => string;
};

function UnitRow({ unit, onUpdated, onError, t }: UnitRowProps) {
  const [rentDraft, setRentDraft] = useState(unit.rent != null ? String(unit.rent) : "");
  const [dateDraft, setDateDraft] = useState(unit.available_date ?? "");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    setRentDraft(unit.rent != null ? String(unit.rent) : "");
    setDateDraft(unit.available_date ?? "");
  }, [unit.id, unit.rent, unit.available_date]);

  const dateValue = dateDraft.trim() || null;
  const dirty = !rentMatches(unit.rent, rentDraft) || dateValue !== unit.available_date;

  const saveDetails = async () => {
    const rent = parseRentDraft(rentDraft);
    if (rent === "invalid") {
      onError(t("buildingsInvalidRent"));
      return;
    }

    setSaving(true);
    try {
      const updated = await updateUnitAdmin(unit.id, {
        rent,
        available_date: dateValue,
      });
      onUpdated(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : t("buildingsGenericError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleForRent = async () => {
    setToggling(true);
    try {
      const updated = await updateUnitAdmin(unit.id, { for_rent: !unit.for_rent });
      onUpdated(updated);
    } catch (e) {
      onError(e instanceof Error ? e.message : t("buildingsGenericError"));
    } finally {
      setToggling(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="min-w-[5rem] sm:pb-1">
        <p className="font-medium text-[#292524]">{unit.unit_number}</p>
      </div>

      <label className="block flex-1 min-w-[7rem] text-xs text-[#78716c] sm:max-w-[8rem]">
        {t("buildingsRent")}
        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={rentDraft}
          onChange={(e) => setRentDraft(e.target.value)}
          className={`${inputClass} mt-1`}
        />
      </label>

      <label className="block flex-1 min-w-[9rem] text-xs text-[#78716c] sm:max-w-[11rem]">
        {t("buildingsAvailableDate")}
        <input
          type="text"
          value={dateDraft}
          onChange={(e) => setDateDraft(e.target.value)}
          placeholder={t("buildingsAvailablePlaceholder")}
          className={`${inputClass} mt-1`}
        />
      </label>

      <button
        type="button"
        onClick={saveDetails}
        disabled={!dirty || saving}
        className="rounded bg-[#3d5a45] px-3 py-1.5 text-xs font-medium text-[#f4f1ec] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? t("buildingsSaving") : t("buildingsSave")}
      </button>

      <button
        type="button"
        onClick={toggleForRent}
        disabled={toggling}
        className={`rounded px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${
          unit.for_rent
            ? "bg-[#3d5a45] text-white"
            : "border border-[#d6d0c4] text-[#57534e]"
        }`}
      >
        {unit.for_rent ? t("buildingsForRent") : t("buildingsNotForRent")}
      </button>
    </li>
  );
}

export default function BuildingsAdminPage() {
  const { t } = useAdminLocaleContext();
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [units, setUnits] = useState<UnitAdmin[]>([]);
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
  };

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-[#292524]">{t("buildingsTitle")}</h1>

      {error && (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {buildings.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setError(null);
              setSelectedId(b.id);
            }}
            className={`rounded border px-3 py-2 text-sm ${
              selectedId === b.id
                ? "border-[#3d5a45] bg-[#f6faf6] text-[#1a3d22]"
                : "border-[#e7e0d5] bg-white text-[#57534e]"
            }`}
          >
            {b.name}
          </button>
        ))}
      </div>

      {loadingUnits ? (
        <p className="mt-6 text-sm text-[#78716c]">{t("loading")}</p>
      ) : units.length === 0 ? (
        <p className="mt-6 text-sm text-[#78716c]">{t("buildingsEmptyUnits")}</p>
      ) : (
        <ul className="mt-6 divide-y divide-[#ebe5db] rounded border border-[#e7e0d5] bg-[#fffef9]">
          {units.map((u) => (
            <UnitRow
              key={u.id}
              unit={u}
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
