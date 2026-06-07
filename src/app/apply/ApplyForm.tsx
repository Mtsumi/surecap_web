"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building,
  Unit,
  createApplication,
  fetchBuildings,
  fetchUnits,
} from "@/lib/api";
import { Locale, detectLocale, t } from "@/lib/i18n";

type Step = "building" | "unit" | "confirm" | "done";

export default function ApplyForm() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>("fr");
  const [step, setStep] = useState<Step>("building");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preselectBuildingId = searchParams.get("building");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  const loadBuildings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBuildings();
      setBuildings(data);
      if (preselectBuildingId) {
        const b = data.find((x) => x.id === Number(preselectBuildingId));
        if (b) {
          setSelectedBuilding(b);
          setStep("unit");
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "error"));
    } finally {
      setLoading(false);
    }
  }, [preselectBuildingId, locale]);

  useEffect(() => {
    loadBuildings();
  }, [loadBuildings]);

  useEffect(() => {
    if (!selectedBuilding) return;
    setLoading(true);
    fetchUnits(selectedBuilding.id)
      .then(setUnits)
      .catch((e) =>
        setError(e instanceof Error ? e.message : t(locale, "error"))
      )
      .finally(() => setLoading(false));
  }, [selectedBuilding, locale]);

  const toggleLocale = () => {
    setLocale((l) => (l === "en" ? "fr" : "en"));
  };

  const handleSelectBuilding = (b: Building) => {
    setSelectedBuilding(b);
    setSelectedUnit(null);
    setStep("unit");
  };

  const handleSelectUnit = (u: Unit) => {
    setSelectedUnit(u);
    setStep("confirm");
  };

  const handleSubmit = async () => {
    if (!selectedUnit) return;
    setSubmitting(true);
    setError(null);
    try {
      const app = await createApplication(selectedUnit.id);
      setApplicationId(app.id);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t(locale, "title")}</h1>
          <p className="mt-1 text-sm text-slate-600">{t(locale, "subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={toggleLocale}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-white"
        >
          {t(locale, "langToggle")}
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading && step !== "done" && (
        <p className="text-center text-slate-500">{t(locale, "loading")}</p>
      )}

      {!loading && step === "building" && (
        <section>
          <h2 className="mb-4 text-lg font-medium">{t(locale, "selectBuilding")}</h2>
          <ul className="space-y-3">
            {buildings.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => handleSelectBuilding(b)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-400 hover:shadow"
                >
                  <span className="block font-medium">{b.name}</span>
                  <span className="mt-1 block text-sm text-slate-600">{b.address}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === "unit" && selectedBuilding && !loading && (
        <section>
          <button
            type="button"
            onClick={() => setStep("building")}
            className="mb-4 text-sm text-blue-600 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-1 text-lg font-medium">{t(locale, "selectUnit")}</h2>
          <p className="mb-4 text-sm text-slate-600">{selectedBuilding.name}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {units.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => handleSelectUnit(u)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-4 text-center font-medium shadow-sm hover:border-blue-400"
                >
                  {u.unit_number}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === "confirm" && selectedBuilding && selectedUnit && (
        <section>
          <button
            type="button"
            onClick={() => setStep("unit")}
            className="mb-4 text-sm text-blue-600 hover:underline"
          >
            ← {t(locale, "back")}
          </button>
          <h2 className="mb-4 text-lg font-medium">{t(locale, "confirm")}</h2>
          <dl className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                {t(locale, "building")}
              </dt>
              <dd className="font-medium">{selectedBuilding.name}</dd>
              <dd className="text-sm text-slate-600">{selectedBuilding.address}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                {t(locale, "unit")}
              </dt>
              <dd className="font-medium">{selectedUnit.unit_number}</dd>
            </div>
          </dl>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-blue-700 py-3.5 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {submitting ? t(locale, "loading") : t(locale, "submit")}
          </button>
        </section>
      )}

      {step === "done" && applicationId !== null && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
          <h2 className="text-xl font-semibold text-green-900">
            {t(locale, "successTitle")}
          </h2>
          <p className="mt-2 text-green-800">{t(locale, "successBody")}</p>
          <p className="mt-4 text-sm text-green-700">
            {t(locale, "applicationId")}: <strong>#{applicationId}</strong>
          </p>
        </section>
      )}
    </main>
  );
}
