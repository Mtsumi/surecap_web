"use client";

import { useCallback, useEffect, useRef, type MutableRefObject, type PointerEvent } from "react";

export type SignaturePadHandle = {
  clear: () => void;
  toPng: () => string | null;
  hasInk: () => boolean;
};

type Props = {
  padRef: MutableRefObject<SignaturePadHandle | null>;
  disabled?: boolean;
  onInkChange?: (hasInk: boolean) => void;
};

export default function SignaturePad({ padRef, disabled = false, onInkChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const ink = useRef(false);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#1c1917";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ink.current = false;
    onInkChange?.(false);
  }, [onInkChange]);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(event.pointerId);
    drawing.current = true;
    const { x, y } = point(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = point(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!ink.current) {
      ink.current = true;
      onInkChange?.(true);
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    canvasRef.current?.releasePointerCapture(event.pointerId);
  };

  useEffect(() => {
    padRef.current = {
      clear: () => resize(),
      hasInk: () => ink.current,
      toPng: () => {
        const canvas = canvasRef.current;
        if (!canvas || !ink.current) return null;
        return canvas.toDataURL("image/png");
      },
    };
    return () => {
      padRef.current = null;
    };
  }, [padRef, resize]);

  return (
    <canvas
      ref={canvasRef}
      className="h-36 w-full touch-none rounded border border-[#d6d3d1] bg-white"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    />
  );
}
