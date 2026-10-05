"use client";

import { useEffect, useState } from "react";
import { useAdminLocaleContext } from "../AdminLocaleContext";
import { adminUi } from "@/lib/adminUi";
import {
  LISTING_AREAS,
  listingAreaAbsoluteUrl,
  type ListingArea,
} from "@/lib/listingAreas";

function AreaQrCard({
  area,
  url,
  locale,
}: {
  area: ListingArea;
  url: string;
  locale: "fr" | "en";
}) {
  const { t } = useAdminLocaleContext();
  const [src, setSrc] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    import("qrcode")
      .then((QR) =>
        QR.toDataURL(url, {
          margin: 1,
          width: 280,
          errorCorrectionLevel: "M",
        })
      )
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className={`${adminUi.cardPad} flex break-inside-avoid flex-col gap-4`}>
      <div>
        <h2 className="text-lg font-semibold text-[var(--ml-ink)]">{area.labels[locale]}</h2>
        <p className="mt-1 text-sm text-[var(--ml-steel)]">{area.buildings.join(", ")}</p>
      </div>
      {src ? (
        <img
          src={src}
          alt={area.labels[locale]}
          className="h-auto w-full max-w-[220px]"
        />
      ) : (
        <div className="h-[220px] w-full max-w-[220px] rounded bg-[var(--ml-paper)]" />
      )}
      {url ? <p className="break-all text-sm text-[var(--ml-ink)]">{url}</p> : null}
      <div className="mt-auto flex flex-wrap gap-2 print:hidden">
        <button type="button" className={adminUi.btnSecondary} onClick={() => void copyLink()} disabled={!url}>
          {copied ? t("listingQrCopied") : t("listingQrCopy")}
        </button>
        {src ? (
          <a className={adminUi.btnSecondary} href={src} download={`montreal-living-${area.slug}.png`}>
            {t("listingQrDownload")}
          </a>
        ) : null}
        <a className={adminUi.btnGhost} href={url} target="_blank" rel="noopener noreferrer">
          {t("listingQrOpen")}
        </a>
      </div>
    </article>
  );
}

export default function AdminListingQrPage() {
  const { t, locale } = useAdminLocaleContext();
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className={adminUi.pageTitle}>{t("listingQrTitle")}</h1>
          <p className={`${adminUi.pageSubtitle} mt-2 max-w-2xl`}>{t("listingQrSubtitle")}</p>
        </div>
        <button type="button" className={`${adminUi.btnPrimary} print:hidden`} onClick={() => window.print()}>
          {t("listingQrPrint")}
        </button>
      </div>
      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LISTING_AREAS.map((area) => (
          <li key={area.slug}>
            <AreaQrCard
              area={area}
              locale={locale}
              url={origin ? listingAreaAbsoluteUrl(origin, area.slug) : ""}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
