"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminLocaleContext } from "../../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import { getAdminToken } from "@/lib/adminAuth";
import {
  listBuildingsAdmin,
  listUnitsAdmin,
  type BuildingAdmin,
  type UnitAdmin,
} from "@/lib/adminApi";
import {
  ASK_BAND,
  AmenityChip,
  CompPhotos,
  TrendBadge,
  amenitySplitLines,
  bedsLabel,
  downloadCsv,
  matchInventoryBuilding,
  photoUrls,
  unitBedsKey,
  type BuildingInsight,
} from "../shared";

type InventoryState =
  | { status: "loading" }
  | { status: "unmatched" }
  | { status: "error" }
  | { status: "ok"; building: BuildingAdmin; units: UnitAdmin[] };

export default function BuildingDetailPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const { t } = useAdminLocaleContext();
  const [data, setData] = useState<BuildingInsight | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<InventoryState>({ status: "loading" });

  useEffect(() => {
    const token = getAdminToken();
    fetch(`/api/insights?building=${encodeURIComponent(key)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json: Record<string, unknown>) => {
        if (json.error) {
          setError(json.error as string);
        } else {
          const building = json[key] as BuildingInsight | undefined;
          if (!building) {
            setError("Building not found.");
          } else {
            setData(building);
          }
        }
      })
      .catch(() => setError(t("insightsError")));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setInventory({ status: "loading" });
    void listBuildingsAdmin()
      .then(async (buildings) => {
        const matched = matchInventoryBuilding(data, buildings);
        if (!matched) {
          if (!cancelled) setInventory({ status: "unmatched" });
          return;
        }
        const units = await listUnitsAdmin(matched.id);
        if (!cancelled) {
          setInventory({
            status: "ok",
            building: matched,
            units: units.filter((u) => u.active && u.for_rent),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setInventory({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [data]);

  const bedKeys = data
    ? Object.keys(data.by_bedrooms)
        .filter((k) => k !== "?")
        .sort((a, b) => {
          if (a === "studio") return -1;
          if (b === "studio") return 1;
          return Number(a) - Number(b);
        })
    : [];

  return (
    <>
      <div className="mb-5">
        <Link
          href="/admin/insights"
          className="text-sm text-[var(--ml-steel)] underline hover:text-[var(--ml-ink)]"
        >
          {t("insightsBack")}
        </Link>
      </div>

      {!data && !error && (
        <p className={`${adminUi.empty} mt-8`}>{t("insightsLoading")}</p>
      )}

      {error && <div className={`${adminUi.alertError} mt-6`}>{error}</div>}

      {data && (
        <>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className={adminUi.pageTitle}>{data.display_name}</h1>
              <p className="mt-1 text-sm text-[var(--ml-steel)]">{data.address}</p>
              <p className="mt-0.5 text-xs text-[var(--ml-steel)]">
                {data.last_scraped
                  ? `${t("insightsLastScraped")}: ${data.last_scraped}`
                  : t("insightsNeverScraped")}
                {data.run_count > 0 && ` · ${data.run_count} ${t("insightsRuns")}`}
              </p>
            </div>
            {data.top_comps.length > 0 && (
              <button
                type="button"
                onClick={() => downloadCsv(data.top_comps, data.display_name)}
                className={`${adminUi.btnPrimary} shrink-0 text-sm`}
              >
                {t("insightsDownloadCsv")}
              </button>
            )}
          </div>

          <div className={`${adminUi.card} mb-6`}>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-sm font-semibold text-[var(--ml-ink)]">
                {t("insightsYourUnits")}
              </p>
              <Link
                href="/admin/buildings"
                className="text-xs text-[var(--ml-steel)] underline hover:text-[var(--ml-ink)]"
              >
                {t("insightsManageUnits")}
              </Link>
            </div>
            {inventory.status === "loading" && (
              <p className="border-t border-[var(--ml-line)] px-4 py-3 text-xs text-[var(--ml-steel)]">
                {t("insightsLoading")}
              </p>
            )}
            {inventory.status === "unmatched" && (
              <p className="border-t border-[var(--ml-line)] px-4 py-3 text-xs text-[var(--ml-steel)]">
                {t("insightsNoInventoryMatch")}
              </p>
            )}
            {inventory.status === "error" && (
              <p className="border-t border-[var(--ml-line)] px-4 py-3 text-xs text-red-700">
                {t("insightsError")}
              </p>
            )}
            {inventory.status === "ok" && inventory.units.length === 0 && (
              <p className="border-t border-[var(--ml-line)] px-4 py-3 text-xs text-[var(--ml-steel)]">
                {t("insightsNoVacantUnits")}
              </p>
            )}
            {inventory.status === "ok" && inventory.units.length > 0 && (
              <>
                <p className="border-t border-[var(--ml-line)] px-4 py-2 text-[10px] text-[var(--ml-steel)]">
                  {t("insightsSelectUnit")}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--ml-steel)]">
                        <th className="px-4 py-2">{t("insightsUnit")}</th>
                        <th className="px-4 py-2">{t("insightsBeds")}</th>
                        <th className="px-4 py-2 text-right">{t("insightsAsking")}</th>
                        <th className="px-4 py-2 text-right">{t("insightsMarketMedian")}</th>
                        <th className="px-4 py-2 text-right">{t("insightsVsMarket")}</th>
                        <th className="px-4 py-2 text-right">{t("insightsNearAsk")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.units.map((unit) => {
                        const beds = unitBedsKey(unit);
                        const market = beds !== "?" ? data.by_bedrooms[beds] : undefined;
                        const ask = unit.rent;
                        const vs =
                          ask != null && market ? ask - market.median : null;
                        const near =
                          ask != null
                            ? data.top_comps.filter(
                                (c) =>
                                  (beds === "?" || c.beds === beds) &&
                                  Math.abs(c.price - ask) <= ASK_BAND
                              ).length
                            : 0;
                        return (
                          <tr
                            key={unit.id}
                            role="link"
                            tabIndex={0}
                            onClick={() =>
                              router.push(`/admin/insights/${key}/units/${unit.id}`)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/admin/insights/${key}/units/${unit.id}`);
                              }
                            }}
                            className="cursor-pointer border-t border-[var(--ml-line)] hover:bg-[var(--ml-paper)]"
                          >
                            <td className="px-4 py-2.5 font-medium text-[var(--ml-ink)]">
                              {unit.unit_number}
                              {unit.available_date && (
                                <span className="ml-2 text-[10px] font-normal text-[var(--ml-steel)]">
                                  {unit.available_date}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-[var(--ml-steel)]">
                              {bedsLabel(beds, t("insightsStudio"))}
                            </td>
                            <td className="px-4 py-2.5 text-right font-semibold text-[var(--ml-ink)]">
                              {ask != null
                                ? `$${ask.toLocaleString()}`
                                : t("insightsNoAsking")}
                            </td>
                            <td className="px-4 py-2.5 text-right text-[var(--ml-steel)]">
                              {market ? `$${market.median.toLocaleString()}` : "—"}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right text-xs ${
                                vs == null
                                  ? "text-[var(--ml-steel)]"
                                  : vs > 0
                                    ? "text-red-700"
                                    : vs < 0
                                      ? "text-green-700"
                                      : "text-[var(--ml-steel)]"
                              }`}
                            >
                              {vs == null
                                ? "—"
                                : `${vs > 0 ? "+" : ""}$${vs.toLocaleString()}`}
                            </td>
                            <td className="px-4 py-2.5 text-right text-[var(--ml-steel)]">
                              {ask != null ? near : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {bedKeys.length > 0 && (
            <div className={`${adminUi.card} mb-6`}>
              <p className="px-4 py-3 text-sm font-semibold text-[var(--ml-ink)]">
                {t("insightsSuggested")}
              </p>
              <div className="overflow-x-auto border-t border-[var(--ml-line)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--ml-steel)]">
                      <th className="px-4 py-2">{t("insightsBeds")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsComps")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsMedian")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsRange")}</th>
                      <th className="px-4 py-2 text-right">{t("insightsSuggested")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bedKeys.map((k) => {
                      const s = data.by_bedrooms[k];
                      const lines = amenitySplitLines(s.amenity_splits, t);
                      return (
                        <tr key={k} className="border-t border-[var(--ml-line)]">
                          <td className="px-4 py-2.5 font-medium text-[var(--ml-ink)]">
                            {bedsLabel(k, t("insightsStudio"))}
                            <TrendBadge summary={s} t={t} />
                            {lines.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-[10px] font-normal text-[var(--ml-steel)]">
                                {lines.map((line) => (
                                  <li key={line}>{line}</li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[var(--ml-steel)]">
                            {s.count}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-[var(--ml-ink)]">
                            ${s.median.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-[var(--ml-steel)]">
                            ${s.min.toLocaleString()} – ${s.max.toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-[var(--ml-pine)]">
                            ${s.suggested_min.toLocaleString()} – $
                            {s.suggested_max.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.top_comps.length > 0 ? (
            <div className={adminUi.card}>
              <p className="px-4 py-3 text-sm font-semibold text-[var(--ml-ink)]">
                {`${t("insightsAllComps")} (${data.top_comps.length})`}
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
                    {data.top_comps.map((comp, i) => (
                      <tr
                        key={i}
                        className="border-t border-[var(--ml-line)] hover:bg-[var(--ml-paper)]"
                      >
                        <td className="px-4 py-2.5">
                          <CompPhotos
                            images={photoUrls(comp)}
                            alt={comp.title || comp.address || ""}
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
                          </div>
                        </td>
                      </tr>
                    ))}
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
