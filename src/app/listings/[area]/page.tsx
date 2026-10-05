import { Suspense } from "react";
import type { Metadata } from "next";
import { listingAreaBySlug } from "@/lib/listingAreas";
import ListingsBrowser from "../ListingsBrowser";

type Props = { params: { area: string } };

export function generateMetadata({ params }: Props): Metadata {
  const area = listingAreaBySlug(params.area);
  const name = area?.labels.fr ?? "Logements";
  return {
    title: `Montreal Living — ${name}`,
    description: "Browse available apartments and start a rental application.",
  };
}

export default function AreaListingsPage({ params }: Props) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-500">Loading…</p>}>
      <ListingsBrowser areaSlug={params.area} />
    </Suspense>
  );
}
