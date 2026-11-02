"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

export type SignatureHandle = { toBlob: () => Promise<Blob | null>; clear: () => void; isEmpty: () => boolean };

export const SignaturePad = forwardRef<SignatureHandle>(function SignaturePad(_, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const emptyRef = useRef(true);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    emptyRef.current = true;
    setEmpty(true);
  };

  useImperativeHandle(ref, () => ({
    isEmpty: () => emptyRef.current,
    clear,
    toBlob: () => new Promise((res) => canvas.current!.toBlob(res, "image/png")),
  }));

  return (
    <div>
      <canvas
        ref={canvas}
        className="bg-background h-40 w-full touch-none rounded-md border"
        onPointerDown={(e) => {
          drawing.current = true;
          canvas.current!.setPointerCapture(e.pointerId);
          const [x, y] = pos(e);
          const ctx = canvas.current!.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const [x, y] = pos(e);
          const ctx = canvas.current!.getContext("2d")!;
          ctx.lineTo(x, y);
          ctx.stroke();
          if (emptyRef.current) {
            emptyRef.current = false;
            setEmpty(false);
          }
        }}
        onPointerUp={() => (drawing.current = false)}
        onPointerCancel={() => (drawing.current = false)}
      />
      <div className="text-muted-foreground mt-1 flex justify-between text-xs">
        <span>{empty ? "Tanda tangan penerima di sini" : "Tanda tangan terisi"}</span>
        <button type="button" className="underline" onClick={clear}>
          Ulangi
        </button>
      </div>
    </div>
  );
});
