"use client";

import { useEffect, useRef } from "react";

/**
 * Aurora — animated gradient blobs on a canvas.
 * - Renders behind content (use absolute positioning in parent)
 * - No external deps; requestAnimationFrame; devicePixelRatio-aware
 */
export default function Aurora({
  opacity = 0.5,
  speed = 0.4,           // 0.2 – 1.0 feels good
  blur = 160,            // px blur radius
}: {
  opacity?: number;
  speed?: number;
  blur?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    let w = 0, h = 0, dpr = 1;

    const blobs = [
      // x, y, r, hue, vx, vy
      { x: 0.2, y: 0.35, r: 0.28, hue: 195, vx: 0.12, vy: 0.07 },
      { x: 0.75, y: 0.25, r: 0.24, hue: 205, vx: -0.08, vy: 0.06 },
      { x: 0.55, y: 0.70, r: 0.26, hue: 225, vx: 0.06, vy: -0.09 },
    ];

    function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = Math.floor(rect.width);
      h = Math.floor(rect.height);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function step(t: number) {
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = opacity;

      // big soft blur
      // (draw blurred circles via shadow instead of filters for perf)
      blobs.forEach((b, i) => {
        b.x += (b.vx * speed) / 1000;
        b.y += (b.vy * speed) / 1000;

        // bounce softly
        if (b.x < 0.05 || b.x > 0.95) b.vx *= -1;
        if (b.y < 0.05 || b.y > 0.95) b.vy *= -1;

        const cx = b.x * w;
        const cy = b.y * h;
        const r = b.r * Math.min(w, h);

        ctx.save();
        ctx.shadowColor = `hsla(${b.hue + i * 12}, 90%, 60%, 0.8)`;
        ctx.shadowBlur = blur;
        ctx.fillStyle = `hsla(${b.hue + i * 12}, 90%, 55%, 0.85)`;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      raf.current = requestAnimationFrame(step);
    }

    const onResize = () => resize();
    resize();
    raf.current = requestAnimationFrame(step);
    window.addEventListener("resize", onResize);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", onResize);
    };
  }, [opacity, speed, blur]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none"
    />
  );
}
