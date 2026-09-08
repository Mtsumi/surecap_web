import { Suspense } from "react";
import type { Metadata } from "next";
import ListingsBrowser from "./ListingsBrowser";

export const metadata: Metadata = {
  title: "Montreal Living — Logements à louer",
  description: "Browse available apartments and start a rental application.",
};

export default function ListingsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-slate-500">Loading…</p>}>
      <ListingsBrowser />
    </Suspense>
  );
}
