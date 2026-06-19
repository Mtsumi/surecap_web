"use client";

import { useEffect, useState } from "react";
import AdminShell from "../AdminShell";
import {
  BuildingAdmin,
  UnitAdmin,
  listBuildingsAdmin,
  listUnitsAdmin,
  updateUnitAdmin,
} from "@/lib/adminApi";

export default function BuildingsAdminPage() {
  const [buildings, setBuildings] = useState<BuildingAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [units, setUnits] = useState<UnitAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBuildingsAdmin()
      .then((b) => {
        setBuildings(b);
        if (b.length) setSelectedId(b[0].id);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    listUnitsAdmin(selectedId)
      .then(setUnits)
      .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
  }, [selectedId]);

  const toggleForRent = async (unit: UnitAdmin) => {
    try {
      const updated = await updateUnitAdmin(unit.id, { for_rent: !unit.for_rent });
      setUnits((prev) => prev.map((u) => (u.id === unit.id ? updated : u)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-[#292524]">Immeubles et logements</h1>

      {error && <p className="mt-4 text-sm text-[#7f1d1d]">{error}</p>}

      <div className="mt-6 flex flex-wrap gap-2">
        {buildings.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedId(b.id)}
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

      <ul className="mt-6 divide-y divide-[#ebe5db] rounded border border-[#e7e0d5] bg-[#fffef9]">
        {units.map((u) => (
          <li
            key={u.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p className="font-medium text-[#292524]">{u.unit_number}</p>
              <p className="text-sm text-[#78716c]">
                {u.rent != null ? `${u.rent} $/mois` : "—"}
                {u.available_date ? ` · ${u.available_date}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleForRent(u)}
              className={`rounded px-3 py-1.5 text-xs font-medium ${
                u.for_rent
                  ? "bg-[#3d5a45] text-white"
                  : "border border-[#d6d0c4] text-[#57534e]"
              }`}
            >
              {u.for_rent ? "À louer" : "Non disponible"}
            </button>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
