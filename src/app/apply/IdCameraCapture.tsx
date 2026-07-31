"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { assessImageClarity } from "@/lib/imageClarity";
import { Locale, t } from "@/lib/i18n";

/** CR80 / ID-1 card aspect (width / height). */
const CARD_ASPECT = 85.6 / 53.98;

type Phase = "starting" | "live" | "preview" | "denied";

type Props = {
  locale: Locale;
  onCapture: (file: File) => void;
  onCancel: () => void;
  /** When getUserMedia fails — parent opens native file/camera picker. */
  onUseDeviceCamera: () => void;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export default function IdCameraCapture({
  locale,
  onCapture,
  onCancel,
  onUseDeviceCamera,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [blurry, setBlurry] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanupPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewFile(null);
    setBlurry(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setError(null);
      setPhase("starting");
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("no-camera");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setPhase("live");
      } catch {
        if (!cancelled) {
          setPhase("denied");
          setError(t(locale, "idCameraPermissionDenied"));
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [locale]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const captureFrame = async () => {
    const video = videoRef.current;
    const frame = frameRef.current;
    if (!video || !frame || video.videoWidth < 2 || video.videoHeight < 2) {
      setError(t(locale, "idCameraCaptureFailed"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const videoRect = video.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();

      // object-cover mapping: visible video → source pixels
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.max(videoRect.width / vw, videoRect.height / vh);
      const displayedW = vw * scale;
      const displayedH = vh * scale;
      const offsetX = (videoRect.width - displayedW) / 2;
      const offsetY = (videoRect.height - displayedH) / 2;

      const relLeft = frameRect.left - videoRect.left - offsetX;
      const relTop = frameRect.top - videoRect.top - offsetY;

      let sx = relLeft / scale;
      let sy = relTop / scale;
      let sw = frameRect.width / scale;
      let sh = frameRect.height / scale;

      sx = Math.max(0, Math.min(sx, vw - 2));
      sy = Math.max(0, Math.min(sy, vh - 2));
      sw = Math.max(2, Math.min(sw, vw - sx));
      sh = Math.max(2, Math.min(sh, vh - sy));

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas");

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });
      if (!blob) throw new Error("blob");

      const file = new File([blob], `id-capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      const clarity = await assessImageClarity(blob);
      const url = URL.createObjectURL(blob);

      cleanupPreview();
      setPreviewUrl(url);
      setPreviewFile(file);
      setBlurry(clarity.looksBlurry);
      setPhase("preview");
    } catch {
      setError(t(locale, "idCameraCaptureFailed"));
    } finally {
      setBusy(false);
    }
  };

  const retake = () => {
    cleanupPreview();
    setPhase("live");
  };

  const confirm = () => {
    if (!previewFile) return;
    const file = previewFile;
    cleanupPreview();
    stopStream(streamRef.current);
    streamRef.current = null;
    onCapture(file);
  };

  const handleCancel = () => {
    cleanupPreview();
    stopStream(streamRef.current);
    streamRef.current = null;
    onCancel();
  };

  const handleDeviceFallback = () => {
    cleanupPreview();
    stopStream(streamRef.current);
    streamRef.current = null;
    onUseDeviceCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0c0c0c] text-white">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm text-white/80 underline-offset-2 hover:underline"
        >
          {t(locale, "idCameraCancel")}
        </button>
        <p className="text-sm font-medium tracking-wide">
          {t(locale, "idCameraTitle")}
        </p>
        <span className="w-12" aria-hidden />
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        {(phase === "starting" || phase === "live" || phase === "preview") && (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`absolute inset-0 h-full w-full object-cover ${
              phase === "preview" ? "invisible" : ""
            }`}
          />
        )}

        {phase === "live" && (
          <>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
              <div
                ref={frameRef}
                className="relative w-full max-w-md rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                style={{ aspectRatio: `${CARD_ASPECT}` }}
              />
            </div>
            <p className="pointer-events-none absolute inset-x-0 top-[12%] px-6 text-center text-sm text-white/95 drop-shadow">
              {t(locale, "idCameraAlignHint")}
            </p>
          </>
        )}

        {phase === "preview" && previewUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-4">
            <img
              src={previewUrl}
              alt=""
              className="max-h-[70%] w-full max-w-md rounded-xl object-contain"
            />
            {blurry && (
              <p className="mt-4 max-w-md rounded-lg bg-[#3f2a1a]/95 px-3 py-2 text-center text-sm text-[#fde68a]">
                {t(locale, "idBlurryWarning")}
              </p>
            )}
          </div>
        )}

        {phase === "starting" && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
            {t(locale, "idCameraStarting")}
          </p>
        )}

        {phase === "denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="max-w-sm text-sm text-white/90">
              {error ?? t(locale, "idCameraPermissionDenied")}
            </p>
            <button
              type="button"
              onClick={handleDeviceFallback}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#1c1917]"
            >
              {t(locale, "idCameraUseDevice")}
            </button>
          </div>
        )}
      </div>

      {error && phase !== "denied" && (
        <p className="px-4 py-2 text-center text-sm text-[#fecaca]">{error}</p>
      )}

      <div className="flex items-center justify-center gap-4 px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {phase === "live" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void captureFrame()}
            className="h-16 w-16 rounded-full border-4 border-white bg-white/20 transition hover:bg-white/35 disabled:opacity-50"
            aria-label={t(locale, "idCameraCapture")}
          />
        )}
        {phase === "preview" && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={retake}
              className="rounded-lg border border-white/40 px-4 py-2.5 text-sm font-medium text-white"
            >
              {t(locale, "idCameraRetake")}
            </button>
            <button
              type="button"
              disabled={busy || !previewFile}
              onClick={confirm}
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-[#1c1917] disabled:opacity-50"
            >
              {t(locale, "idCameraUsePhoto")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
