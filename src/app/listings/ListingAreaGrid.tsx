import Link from "next/link";
import type { Listing } from "@/lib/api";
import { LISTING_AREAS, listingAreaPath, listingsForArea } from "@/lib/listingAreas";
import { t, type Locale } from "@/lib/i18n";

type Props = {
  locale: Locale;
  listings: Listing[];
  showCounts: boolean;
};

export default function ListingAreaGrid({ locale, listings, showCounts }: Props) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
      {LISTING_AREAS.map((area) => {
        const count = listingsForArea(listings, area).length;
        const countLabel =
          count === 1
            ? t(locale, "listingsAvailableCountOne")
            : t(locale, "listingsAvailableCount").replace("{count}", String(count));
        return (
          <li
            key={area.slug}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#e7e0d5] bg-[#fffef9] shadow-[0_1px_2px_rgba(41,37,36,0.04)]"
          >
            <Link href={listingAreaPath(area.slug)} className="flex flex-1 flex-col transition hover:bg-[#faf8f4]">
              <img
                src={area.image}
                alt={area.imageAlt[locale]}
                className="h-44 w-full object-cover sm:h-40"
              />
              <div className="flex flex-1 flex-col px-5 py-4">
                <h2 className="text-lg font-semibold text-[#292524]">{area.labels[locale]}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#57534e]">{area.buildings.join(", ")}</p>
                {showCounts ? (
                  <p className="mt-4 text-sm font-medium text-[#3d5a45]">{countLabel}</p>
                ) : null}
              </div>
            </Link>
            <p className="px-5 pb-3 text-[11px] leading-snug text-[#a8a29e]">
              {t(locale, "listingsPhotoCredit")}:{" "}
              <a
                href={area.credit.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {area.credit.author}
              </a>
              {`, ${area.credit.license[locale]}`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
