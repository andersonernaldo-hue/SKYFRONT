import React, { useEffect, useRef } from "react";
import { RARITY_COLORS } from "../game/config";
import { drawPlane } from "../game/art";
import type { PlaneDef } from "../game/data/planes";
import { Audio } from "../game/audio";
import { useI18n } from "../i18n/react";

export function Btn({
  children, onClick, variant = "default", className = "", disabled, icon,
}: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "default" | "primary" | "danger"; className?: string; disabled?: boolean; icon?: string;
}) {
  const { t } = useI18n();
  return (
    <button
      data-uibtn="1"
      disabled={disabled}
      onClick={() => { Audio.resume(); Audio.playSFX("click"); onClick?.(); }}
      className={`hex-btn ${variant} px-5 py-3 text-sm md:text-base flex items-center justify-center gap-2 ${className}`}
    >
      {icon && <span className="text-lg leading-none">{icon}</span>}
      <span>{React.Children.map(children, (child) => typeof child === "string" && child.trim() ? t(child) : child)}</span>
    </button>
  );
}

export function Panel({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`panel scanlines ${className}`} style={style}>{children}</div>;
}

export function Bar({ value, max, color = "#2ee6ff", height = 10, glow = true }: { value: number; max: number; color?: string; height?: number; glow?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="bar-track w-full" style={{ height }}>
      <div
        className="bar-fill h-full"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, #ffffff88)`,
          boxShadow: glow ? `0 0 12px ${color}` : "none",
        }}
      />
    </div>
  );
}

export function RarityTag({ rarity }: { rarity: string }) {
  const { t } = useI18n();
  const c = RARITY_COLORS[rarity] || RARITY_COLORS.COMMON;
  return (
    <span
      className="font-tech text-[10px] px-2 py-[3px] border"
      style={{ color: c.main, borderColor: c.main, boxShadow: `0 0 12px ${c.glow}`, background: "rgba(0,0,0,0.4)" }}
    >
      {t(c.label)}
    </span>
  );
}

/** Animated aircraft showcase renderer */
export function PlaneCanvas({ plane, size = 220, spin = false }: { plane: PlaneDef; size?: number; spin?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = size * dpr;
    cv.height = size * dpr;
    let raf = 0;
    const t0 = performance.now();
    const rc = RARITY_COLORS[plane.rarity];
    const draw = () => {
      const t = (performance.now() - t0) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      // hangar glow floor
      const g = ctx.createRadialGradient(size / 2, size * 0.62, 6, size / 2, size * 0.62, size * 0.55);
      g.addColorStop(0, rc.glow);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.5 + Math.sin(t * 2) * 0.1;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      ctx.globalAlpha = 1;
      // rotating tech ring
      ctx.save();
      ctx.translate(size / 2, size * 0.55);
      ctx.rotate(t * 0.4);
      ctx.strokeStyle = rc.main;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, size * (0.3 + i * 0.06), i * 1.5, i * 1.5 + 3.6);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      ctx.save();
      ctx.translate(size / 2, size * 0.52 + Math.sin(t * 1.6) * size * 0.03);
      const s = (size / 200) * 1.05;
      ctx.scale(s, s);
      ctx.rotate(spin ? Math.sin(t * 0.8) * 0.12 : 0);
      drawPlane(ctx, plane, { t, thrust: 0.85 + Math.sin(t * 3) * 0.12, glow: true, banking: Math.sin(t * 0.9) * 0.35, showcase: true });
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [plane, size, spin]);
  return <canvas ref={ref} style={{ width: size, height: size }} className="pointer-events-none" />;
}

export function StatRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-[10px] font-tech opacity-70">{t(label)}</span>
      <Bar value={value} max={max} color={color} height={8} />
      <span className="w-9 text-right text-[11px] font-tech">{Math.round(value)}</span>
    </div>
  );
}

export function ScreenTitle({ title, sub, onBack }: { title: string; sub?: string; onBack: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 mb-3">
      <Btn onClick={onBack} className="!px-3 !py-2">◀</Btn>
      <div>
        <h2 className="font-tech text-lg sm:text-xl md:text-2xl font-black glow-text">{t(title)}</h2>
        {sub && <p className="text-[11px] uppercase tracking-widest opacity-60">{t(sub)}</p>}
      </div>
    </div>
  );
}
