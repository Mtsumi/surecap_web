"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { assessImageClarity } from "@/lib/imageClarity";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

type Props = {
  locale: Locale;
  file: File;
  onConfirm: (cropped: File) => void;
  onCancel: () => void;
  onRetake: () => void;
};

/**
 * Square crop + optional blur warning before ID upload.
 * Drag to pan; fixed square frame centred on the preview.
 */
export default function IdPhotoCropReview({
  locale,
  file,
  onConfirm,
  onCancel,
  onRetake,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [blurry, setBlurry] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    void assessImageClarity(file).then((a) => setBlurry(a.shouldRetake));
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = () => setDragging(false);

  const exportCrop = async () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    setBusy(true);
    try {
      const size = 1200;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Mirror the CSS cover + translate used in the preview square.
      const frame = 280; // preview frame CSS px (approx); we recompute from natural size
      const scale = Math.max(frame / img.naturalWidth, frame / img.naturalHeight);
      // Use natural dimensions with cover fit into size×size, applying offset scaled.
      const cover = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const drawW = img.naturalWidth * cover;
      const drawH = img.naturalHeight * cover;
      const scaleOffset = size / frame;
      const dx = (size - drawW) / 2 + offset.x * scaleOffset;
      const dy = (size - drawH) / 2 + offset.y * scaleOffset;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, dx, dy, drawW, drawH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.88)
      );
      if (!blob) return;
      const out = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "id"}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onConfirm(out);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
        <h3 className="text-base font-medium text-[#292524]">
          {t(locale, "idCropTitle")}
        </h3>
        <p className="mt-1 text-sm text-[#78716c]">{t(locale, "idCropHint")}</p>

        <div
          className="relative mx-auto mt-4 h-[280px] w-[280px] touch-none overflow-hidden rounded-md bg-[#1c1917]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {objectUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={objectUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                minWidth: "100%",
                minHeight: "100%",
                width: "auto",
                height: "auto",
              }}
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 rounded-md ring-2 ring-white/80 ring-inset" />
        </div>

        {blurry ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {t(locale, "idBlurryWarning")}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void exportCrop()}
            className="w-full rounded bg-[#3d5a45] py-3 text-sm font-medium text-[#f4f1ec] disabled:opacity-60"
          >
            {busy ? t(locale, "loading") : t(locale, "idCropUsePhoto")}
          </button>
          <button
            type="button"
            onClick={onRetake}
            className="w-full rounded border border-[#e7e0d5] py-3 text-sm font-medium text-[#292524]"
          >
            {t(locale, "idCropRetake")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2 text-sm text-[#78716c] underline-offset-2 hover:underline"
          >
            {t(locale, "cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
