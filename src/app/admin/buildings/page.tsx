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
  "mt-1 w-full min-w-0 rounded border border-[#e7e0d5] bg-white px-2 py-2 text-sm outline-none focus:border-[#3d5a45]";

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
          ? "bg-[#3d5a45] text-white"
          : "border border-[#d6d0c4] text-[#57534e]"
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
              <p className="font-medium text-[#292524]">{unit.unit_number}</p>
              <ForRentBadge forRent={unit.for_rent} t={t} />
            </div>
            <dl className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[#78716c]">{t("buildingsRent")}</dt>
                <dd className="mt-0.5 text-[#292524]">
                  {unit.rent != null
                    ? `${unit.rent} ${t("buildingsRentSuffix")}`
                    : t("buildingsNotSet")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#78716c]">{t("buildingsAvailableDate")}</dt>
                <dd className="mt-0.5 break-words text-[#292524]">
                  {unit.available_date || t("buildingsNotSet")}
                </dd>
              </div>
            </dl>
          </div>
          <button
            type="button"
            onClick={onStartEdit}
            aria-label={`${t("buildingsEdit")} ${unit.unit_number}`}
            className="shrink-0 rounded border border-[#e7e0d5] bg-white p-2 text-[#57534e] hover:border-[#3d5a45] hover:text-[#3d5a45]"
          >
            <PencilIcon />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="border-l-2 border-[#3d5a45] bg-[#faf8f4] px-3 py-4 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-[#292524]">{unit.unit_number}</p>
        <span className="text-xs text-[#78716c]">{t("buildingsEdit")}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block text-xs text-[#78716c]">
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
        <label className="block text-xs text-[#78716c]">
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

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-[#57534e]">
        <input
          type="checkbox"
          checked={forRentDraft}
          onChange={(e) => setForRentDraft(e.target.checked)}
          className="h-4 w-4 rounded border-[#d6d0c4] text-[#3d5a45] focus:ring-[#3d5a45]"
        />
        {t("buildingsForRent")}
      </label>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="w-full rounded border border-[#d6d0c4] bg-white px-3 py-2 text-sm font-medium text-[#57534e] disabled:opacity-60 sm:w-auto"
        >
          {t("buildingsCancel")}
        </button>
        <button
          type="button"
          onClick={saveDetails}
          disabled={saving}
          className="w-full rounded bg-[#3d5a45] px-3 py-2 text-sm font-medium text-[#f4f1ec] disabled:opacity-60 sm:w-auto"
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
      <h1 className="text-lg font-semibold text-[#292524]">{t("buildingsTitle")}</h1>

      {error && (
        <p className="mt-4 rounded border border-[#e7c4c4] bg-[#fdf5f5] px-3 py-2 text-sm text-[#7f1d1d]">
          {error}
        </p>
      )}

      <div className="-mx-1 mt-6 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
        {buildings.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              setError(null);
              setSelectedId(b.id);
            }}
            className={`shrink-0 rounded border px-3 py-2 text-sm ${
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
