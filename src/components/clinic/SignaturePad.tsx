import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

export interface SignaturePadHandle {
  toDataURL: () => string;
  clear: () => void;
  isEmpty: () => boolean;
}

// Hand-rolled canvas signature pad (no extra dependency). Pointer events so it works
// with mouse, finger, and stylus. White background so the exported PNG embeds cleanly
// into the consent PDF.
export const SignaturePad = forwardRef<SignaturePadHandle, { height?: number }>(({ height = 180 }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  const fillWhite = () => {
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext("2d");
    if (!x) return;
    x.fillStyle = "#ffffff";
    x.fillRect(0, 0, c.width, c.height);
    x.lineWidth = 2;
    x.lineCap = "round";
    x.strokeStyle = "#111827";
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ro = new ResizeObserver(() => {
      const w = Math.max(1, Math.floor(c.clientWidth));
      if (c.width !== w || c.height !== height) {
        c.width = w;
        c.height = height;
        fillWhite();        // resizing clears the canvas; only happens before the user draws
        dirty.current = false;
      }
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [height]);

  const point = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: React.PointerEvent) => {
    drawing.current = true;
    last.current = point(e);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const x = c.getContext("2d")!;
    const p = point(e);
    x.beginPath();
    x.moveTo(last.current!.x, last.current!.y);
    x.lineTo(p.x, p.y);
    x.stroke();
    last.current = p;
    dirty.current = true;
  };
  const onUp = () => { drawing.current = false; last.current = null; };

  useImperativeHandle(ref, () => ({
    toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? "",
    clear: () => { fillWhite(); dirty.current = false; },
    isEmpty: () => !dirty.current,
  }));

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
        className="w-full touch-none rounded-md border bg-white"
        style={{ height }}
        data-testid="signature-pad-canvas"
      />
      <div className="flex justify-end">
        <Button type="button" size="sm" variant="ghost" data-testid="signature-clear"
          onClick={() => { fillWhite(); dirty.current = false; }}>
          <Eraser className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
      </div>
    </div>
  );
});
SignaturePad.displayName = "SignaturePad";
