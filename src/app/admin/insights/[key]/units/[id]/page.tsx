"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAdminLocaleContext } from "../../../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import { getAdminToken } from "@/lib/adminAuth";
import { listBuildingsAdmin, listUnitsAdmin, type UnitAdmin } from "@/lib/adminApi";
import {
  ASK_BAND,
  AmenityChip,
  CompPhotos,
  amenitySplitLines,
  bedsLabel,
  matchInventoryBuilding,
  photoUrls,
  unitBedsKey,
  type BuildingInsight,
} from "../../../shared";

export default function UnitInsightPage() {
  const { key, id } = useParams<{ key: string; id: string }>();
  const { t } = useAdminLocaleContext();
  const unitId = Number(id);
  const [data, setData] = useState<BuildingInsight | null>(null);
  const [unit, setUnit] = useState<UnitAdmin | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    fetch(`/api/insights?building=${encodeURIComponent(key)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json: Record<string, unknown>) => {
        if (json.error) {
          setError(json.error as string);
          return;
        }
        const building = json[key] as BuildingInsight | undefined;
        if (!building) {
          setError("Building not found.");
          return;
        }
        setData(building);
      })
      .catch(() => setError(t("insightsError")));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    void listBuildingsAdmin()
      .then(async (buildings) => {
        const matched = matchInventoryBuilding(data, buildings);
        if (!matched) {
          if (!cancelled) setUnit(null);
          return;
        }
        const units = await listUnitsAdmin(matched.id);
        if (!cancelled) {
          setUnit(
            units.find((u) => u.id === unitId && u.active && u.for_rent) ?? null
          );
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("insightsError"));
      });
    return () => {
      cancelled = true;
    };
  }, [data, unitId, t]);

  const beds = unit ? unitBedsKey(unit) : null;
  const market = beds && beds !== "?" ? data?.by_bedrooms[beds] : undefined;
  const ask = unit?.rent ?? null;
  const comps =
    data?.top_comps.filter((c) => {
      if (!beds || beds === "?") return true;
      return c.beds === beds;
    }) ?? [];
  const near =
    ask != null
      ? comps.filter((c) => Math.abs(c.price - ask) <= ASK_BAND).length
      : 0;
  const amenityLines = amenitySplitLines(market?.amenity_splits, t);

  return (
    <>
      <div className="mb-5">
        <Link
          href={`/admin/insights/${key}`}
          className="text-sm text-[var(--ml-steel)] underline hover:text-[var(--ml-ink)]"
        >
          {t("insightsBackToBuilding")}
        </Link>
      </div>

      {!data && !error && (
        <p className={`${adminUi.empty} mt-8`}>{t("insightsLoading")}</p>
      )}
      {error && <div className={`${adminUi.alertError} mt-6`}>{error}</div>}
      {data && unit === null && (
        <div className={`${adminUi.alertError} mt-6`}>{t("insightsUnitNotFound")}</div>
      )}

      {data && unit && (
        <>
          <div className="mb-6">
            <h1 className={adminUi.pageTitle}>
              {data.display_name} · {unit.unit_number}
            </h1>
            <p className="mt-1 text-sm text-[var(--ml-steel)]">{data.address}</p>
            <p className="mt-3 text-sm text-[var(--ml-ink)]">
              {t("insightsUnitSentence")
                .replace("{beds}", bedsLabel(beds || "?", t("insightsStudio")))
                .replace("{median}", market ? market.median.toLocaleString() : "—")}
              {ask != null && (
                <>
                  {" "}
                  {t("insightsUnitAsking").replace("{ask}", ask.toLocaleString())}
                </>
              )}
            </p>
            {ask != null && (
              <p className="mt-1 text-xs text-[var(--ml-steel)]">
                {t("insightsNearAskCount").replace("{count}", String(near))}
              </p>
            )}
            {market && (
              <p className="mt-1 text-xs text-[var(--ml-pine)]">
                {t("insightsSuggested")}: ${market.suggested_min.toLocaleString()} – $
                {market.suggested_max.toLocaleString()}
              </p>
            )}
            {amenityLines.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-[var(--ml-ink)]">
                  {t("insightsAmenityMarket")}
                </p>
                <ul className="mt-1 space-y-0.5 text-xs text-[var(--ml-steel)]">
                  {amenityLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {comps.length > 0 ? (
            <div className={adminUi.card}>
              <p className="px-4 py-3 text-sm font-semibold text-[var(--ml-ink)]">
                {beds
                  ? `${bedsLabel(beds, t("insightsStudio"))} — ${comps.length}`
                  : `${t("insightsAllComps")} (${comps.length})`}
                {ask != null && (
                  <span className="ml-2 text-xs font-normal text-[var(--ml-steel)]">
                    {t("insightsShowingNearAsk")}
                  </span>
                )}
              </p>
              <div className="overflow-x-auto border-t border-[var(--ml-line)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--ml-steel)]">
                      <th className="px-4 py-2" />
                      <th className="px-4 py-2 text-right">{t("insightsPrice")}</th>
                      <th className="px-4 py-2">{t("insightsBeds")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsDistance")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsSqft")}</th>
                      <th className="px-4 py-2">{t("insightsSource")}</th>
                      <th className="px-4 py-2">{t("insightsAddress")}</th>
                      <th className="px-4 py-2">{t("insightsAmenities")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((comp, i) => {
                      const nearAsk =
                        ask != null && Math.abs(comp.price - ask) <= ASK_BAND;
                      return (
                        <tr
                          key={i}
                          className={`border-t border-[var(--ml-line)] hover:bg-[var(--ml-paper)] ${
                            nearAsk ? "bg-amber-50" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <CompPhotos
                              images={photoUrls(comp)}
                              alt={comp.title || comp.address || ""}
                              size="card"
                              prevLabel={t("insightsPhotoPrev")}
                              nextLabel={t("insightsPhotoNext")}
                            />
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--ml-ink)]">
                            ${comp.price.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-[var(--ml-steel)]">
                            {bedsLabel(comp.beds, t("insightsStudio"))}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-[var(--ml-steel)]">
                            {comp.distance_km} km
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-[var(--ml-steel)]">
                            {comp.square_feet
                              ? `${comp.square_feet.toLocaleString()}`
                              : "—"}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="inline-flex rounded bg-[var(--ml-paper)] px-1.5 py-0.5 text-[10px] text-[var(--ml-steel)]">
                              {comp.source}
                            </span>
                          </td>
                          <td className="max-w-xs px-4 py-2.5">
                            {comp.url ? (
                              <a
                                href={comp.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-sm text-[var(--ml-pine)] hover:underline"
                              >
                                {comp.title || comp.address || "Listing"}
                              </a>
                            ) : (
                              <span className="truncate text-sm text-[var(--ml-steel)]">
                                {comp.title || comp.address || "—"}
                              </span>
                            )}
                            {comp.address && comp.title && (
                              <p className="mt-0.5 truncate text-[10px] text-[var(--ml-steel)]">
                                {comp.address}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              <AmenityChip
                                on={comp.heating}
                                label={t("insightsHeating")}
                                tip={t("insightsHeatingTip")}
                              />
                              <AmenityChip
                                on={comp.parking}
                                label={t("insightsParking")}
                                tip={
                                  comp.parking_type
                                    ? String(comp.parking_type)
                                    : t("insightsParkingTip")
                                }
                              />
                              <AmenityChip
                                on={comp.air_conditioning}
                                label={t("insightsAC")}
                                tip={t("insightsACTip")}
                              />
                              <AmenityChip
                                on={comp.laundry_in_unit}
                                label={t("insightsLaundry")}
                                tip={t("insightsLaundryTip")}
                              />
                              <AmenityChip
                                on={comp.furnished}
                                label={t("insightsFurnished")}
                                tip={t("insightsFurnishedTip")}
                              />
                              <AmenityChip
                                on={comp.electricity_included}
                                label={t("insightsElectricity")}
                                tip={t("insightsElectricityTip")}
                              />
                              <AmenityChip
                                on={comp.dishwasher}
                                label={t("insightsDishwasher")}
                                tip={t("insightsDishwasherTip")}
                              />
                              <AmenityChip
                                on={comp.balcony}
                                label={t("insightsBalcony")}
                                tip={t("insightsBalconyTip")}
                              />
                              <AmenityChip
                                on={comp.fridge_freezer}
                                label={t("insightsFridge")}
                                tip={t("insightsFridgeTip")}
                              />
                              <AmenityChip
                                on={comp.stove_included}
                                label={t("insightsStove")}
                                tip={t("insightsStoveTip")}
                              />
                              <AmenityChip
                                on={comp.microwave}
                                label={t("insightsMicrowave")}
                                tip={t("insightsMicrowaveTip")}
                              />
                              <AmenityChip
                                on={comp.water_included}
                                label={t("insightsWater")}
                                tip={t("insightsWaterTip")}
                              />
                              <AmenityChip
                                on={comp.bike_parking}
                                label={t("insightsBike")}
                                tip={t("insightsBikeTip")}
                              />
                              <AmenityChip
                                on={comp.concierge}
                                label={t("insightsConcierge")}
                                tip={t("insightsConciergeTip")}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className={`${adminUi.empty} mt-4`}>
              <p>{t("insightsNoData")}</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
