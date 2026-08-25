import { ReactNode, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Calculator, SlidersHorizontal } from "lucide-react";
import { useStore } from "../store";
import { sfx } from "../sfx";

export type PanelKey = "phyxOpen" | "missionsOpen" | "progressOpen" | "menuOpen";

export function openPanel(k: PanelKey) {
  useStore.setState({ phyxOpen: false, missionsOpen: false, progressOpen: false, menuOpen: false, [k]: true });
  sfx.tick();
}
export function closePanels() {
  useStore.setState({ phyxOpen: false, missionsOpen: false, progressOpen: false, menuOpen: false });
}

export function useIsMobile() {
  const ref = useRef(typeof window !== "undefined" && window.matchMedia("(max-width: 820px)").matches);
  return ref.current;
}

/* ---------- form controls ---------- */
export function Slider(props: {
  label: string; unit?: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void; format?: (v: number) => string; disabled?: boolean;
}) {
  const { label, unit, min, max, step, value, onChange, format, disabled } = props;
  const shown = format ? format(value) : String(Math.round(value * 100) / 100);
  return (
    <label className={`block ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8fa3c8]">{label}</span>
        <span className="num text-[12px] text-[#53e8ff]">
          {shown}{unit ? <span className="ml-1 text-[10px] text-[#5a6d94]">{unit}</span> : null}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value} aria-label={label}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </label>
  );
}

export function Toggle(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { label, value, onChange } = props;
  return (
    <button
      role="switch" aria-checked={value} aria-label={label}
      onClick={() => { onChange(!value); sfx.tick(); }}
      className="flex w-full items-center justify-between py-1 text-left"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8fa3c8]">{label}</span>
      <span className={`relative h-[18px] w-[36px] rounded-full border transition-colors duration-200 ${value ? "border-[#53e8ff] bg-[rgba(83,232,255,0.25)]" : "border-[#1b2a49] bg-[rgba(13,21,40,0.8)]"}`}>
        <span className={`absolute top-[2px] h-[12px] w-[12px] rounded-full transition-all duration-200 ${value ? "left-[20px] bg-[#53e8ff] shadow-[0_0_10px_rgba(83,232,255,0.8)]" : "left-[2px] bg-[#5a6d94]"}`} />
      </span>
    </button>
  );
}

export function Seg<T extends string>(props: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-md border border-[rgba(96,145,255,0.16)] bg-[rgba(7,11,22,0.7)] p-1">
      {props.options.map((o) => (
        <button
          key={o.id}
          onClick={() => { props.onChange(o.id); sfx.tick(); }}
          className={`flex-1 rounded px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] transition-all duration-200 ${props.value === o.id ? "bg-[rgba(83,232,255,0.16)] text-[#53e8ff] shadow-[inset_0_0_0_1px_rgba(83,232,255,0.35)]" : "text-[#5a6d94] hover:text-[#8fa3c8]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat(props: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div className="rounded-md border border-[rgba(96,145,255,0.12)] bg-[rgba(7,11,22,0.6)] px-2.5 py-2">
      <div className="label-xs !text-[9px]">{props.label}</div>
      <div className="num mt-0.5 text-[15px] leading-tight" style={{ color: props.accent || "#e9f1ff" }}>
        {props.value}
        {props.unit ? <span className="ml-1 text-[10px] text-[#5a6d94]">{props.unit}</span> : null}
      </div>
    </div>
  );
}

export function Btn(props: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "ghost" | "warn";
  className?: string; disabled?: boolean; title?: string;
}) {
  const cls = props.variant === "primary" ? "pv-btn-primary" : "pv-btn-ghost";
  const color = props.variant === "warn" ? "!text-[#ffb454] !border-[rgba(255,180,84,0.4)]" : "";
  return (
    <button
      title={props.title} disabled={props.disabled}
      className={`${cls} ${color} ${props.disabled ? "cursor-not-allowed opacity-40" : ""} ${props.className || ""}`}
      onClick={() => { if (!props.disabled) { sfx.tick(); props.onClick?.(); } }}
    >
      {props.children}
    </button>
  );
}

/* ---------- layout ---------- */
export function Sheet(props: { title: string; icon?: ReactNode; accent?: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={`absolute bottom-4 right-3 top-16 z-40 flex flex-col overflow-hidden rounded-xl pv-panel-solid ${props.wide ? "w-[26rem]" : "w-[21.5rem]"} max-w-[calc(100vw-1.5rem)]`}
      style={{ borderColor: `${props.accent || "#53e8ff"}26` }}
      role="dialog" aria-label={props.title}
    >
      <div className="flex items-center justify-between border-b border-[rgba(96,145,255,0.12)] px-4 py-3">
        <div className="flex items-center gap-2">
          {props.icon}
          <span className="font-display text-[12px] font-bold uppercase tracking-[0.22em]" style={{ color: props.accent || "#53e8ff" }}>{props.title}</span>
        </div>
        <button onClick={() => { props.onClose(); sfx.tick(); }} aria-label="Close panel" className="rounded p-1 text-[#5a6d94] transition-colors hover:text-[#e9f1ff]">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{props.children}</div>
    </motion.div>
  );
}

export function Loader() {
  return (
    <div className="flex h-40 w-full items-center justify-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border border-[rgba(83,232,255,0.15)]" />
        <div className="absolute inset-0 rounded-full border-t border-[#53e8ff] anim-spin-slow" style={{ animationDuration: "1.1s" }} />
        <div className="absolute inset-[9px] rounded-full bg-[radial-gradient(circle,rgba(83,232,255,0.5),transparent_70%)] anim-pulse" />
      </div>
    </div>
  );
}

/* ---------- canvas animation loop hook ---------- */
export function useCanvasLoop(draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number) => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      cv.width = Math.max(4, Math.round(r.width * dpr));
      cv.height = Math.max(4, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!useStore.getState().paused) t += dt;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawRef.current(ctx, cv.width / dpr, cv.height / dpr, t, dt);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  return ref;
}

export function CanvasFrame(props: { children: ReactNode; className?: string }) {
  return (
    <div className={`pv-panel hud-corners relative overflow-hidden rounded-xl ${props.className || ""}`}>
      {props.children}
    </div>
  );
}

/* ---------- world layout helpers ---------- */
export function WorldTabs(props: { items: { id: string; name: string }[]; active: string; onSelect: (id: string) => void; color: string }) {
  return (
    <div className="pointer-events-auto absolute left-3 top-16 z-20 flex max-w-[calc(100vw-6rem)] flex-row gap-1.5 overflow-x-auto pb-1 md:max-w-none md:flex-col md:overflow-visible">
      {props.items.map((it) => {
        const act = it.id === props.active;
        return (
          <button
            key={it.id}
            onClick={() => { props.onSelect(it.id); sfx.tick(); }}
            aria-pressed={act}
            className={`shrink-0 rounded-md border px-3 py-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] transition-all duration-200 ${act ? "pv-panel" : "border-[rgba(96,145,255,0.12)] bg-[rgba(7,11,22,0.6)] text-[#5a6d94] backdrop-blur-md hover:text-[#a9bde2]"}`}
            style={act ? { color: props.color, borderColor: `${props.color}59`, boxShadow: `0 0 18px -6px ${props.color}` } : undefined}
          >
            {it.name}
          </button>
        );
      })}
    </div>
  );
}

export function ControlPanel(props: { title: string; color?: string; children: ReactNode; footer?: ReactNode }) {
  const mobile = useIsMobile();
  const [shown, setShown] = useState(true);
  useEffect(() => { if (mobile) setShown(false); }, [mobile]);
  const accent = props.color || "#53e8ff";
  if (!shown) {
    return (
      <button onClick={() => { setShown(true); sfx.tick(); }} className="pv-hud-btn pointer-events-auto absolute bottom-[4.6rem] right-3 z-30" aria-label="Open controls">
        <SlidersHorizontal size={13} /> Controls
      </button>
    );
  }
  return (
    <div className="pv-panel pointer-events-auto absolute right-3 top-16 z-20 flex max-h-[calc(100%-8.2rem)] w-[19.5rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-xl">
      <div className="flex items-center justify-between border-b border-[rgba(96,145,255,0.12)] px-3.5 py-2.5">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>{props.title}</span>
        <button onClick={() => { setShown(false); sfx.tick(); }} aria-label="Collapse controls" className="rounded p-0.5 text-[#5a6d94] hover:text-[#e9f1ff]"><X size={14} /></button>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3.5">{props.children}</div>
      {props.footer ? <div className="flex gap-2 border-t border-[rgba(96,145,255,0.12)] p-3">{props.footer}</div> : null}
    </div>
  );
}

export function EqButton(props: { onClick: () => void; label?: string }) {
  return (
    <Btn variant="ghost" className="w-full !py-2 !text-[10px]" onClick={props.onClick}>
      <Calculator size={12} className="text-[#53e8ff]" /> {props.label || "Show the Physics"}
    </Btn>
  );
}
