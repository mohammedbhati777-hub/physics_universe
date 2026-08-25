import { useEffect, useMemo, useRef } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Rocket, RotateCcw, Play } from "lucide-react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Toggle, Stat, Btn, Seg, EqButton } from "../components/ui";
import { projectile, pendulumPeriod, pendulumStep, collide1D, fmt } from "../physics";
import { sfx } from "../sfx";

const META = WORLDS.find((w) => w.id === "mechanics")!;

function MiniChart(props: { data: { t: number; v: number }[]; color: string; label: string }) {
  return (
    <div className="rounded-md border border-[rgba(96,145,255,0.12)] bg-[rgba(7,11,22,0.55)] p-2">
      <div className="label-xs mb-1 !text-[8px]">{props.label}</div>
      <div className="h-[72px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={props.data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
            <XAxis dataKey="t" tick={{ fontSize: 8, fill: "#5a6d94", fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={{ stroke: "#1b2a49" }} />
            <YAxis tick={{ fontSize: 8, fill: "#5a6d94", fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} width={36} />
            <Tooltip contentStyle={{ background: "#0a1122", border: "1px solid #1b2a49", borderRadius: 8, fontSize: 10 }} labelStyle={{ color: "#8fa3c8" }} />
            <Line type="monotone" dataKey="v" stroke={props.color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ================= Projectile ================= */
function ProjectileUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const bump = useStore((s) => s.bump);
  const resetWorld = useStore((s) => s.resetWorld);
  const openEq = useStore((s) => s.openEq);

  const v0 = Number(sim.pj_v0); const ang = Number(sim.pj_ang); const g = Number(sim.pj_g);
  const h0 = Number(sim.pj_h0); const drag = Boolean(sim.pj_drag);

  const out = useMemo(() => projectile(v0, ang, g, h0, drag), [v0, ang, g, h0, drag]);
  const dataH = useMemo(() => out.pts.filter((_, i) => i % 3 === 0).map((p) => ({ t: +p.t.toFixed(2), v: +p.y.toFixed(2) })), [out]);
  const dataD = useMemo(() => out.pts.filter((_, i) => i % 3 === 0).map((p) => ({ t: +p.t.toFixed(2), v: +p.x.toFixed(2) })), [out]);

  const th = (ang * Math.PI) / 180;
  const showEq = () => openEq({
    title: "Projectile Motion",
    formula: "x = v₀cosθ·t    y = h₀ + v₀sinθ·t − ½gt²",
    vars: [["v₀", `${v0} m/s`], ["θ", `${ang}°`], ["g", `${g} m/s²`], ["h₀", `${h0} m`], ["drag", drag ? "k = 0.028 · ON" : "OFF"]],
    steps: [
      `v₀ₓ = v₀·cos θ = ${v0} × ${fmt(Math.cos(th), 3)} = ${fmt(v0 * Math.cos(th))} m/s`,
      `v₀ᵧ = v₀·sin θ = ${v0} × ${fmt(Math.sin(th), 3)} = ${fmt(v0 * Math.sin(th))} m/s`,
      drag
        ? `With drag: a = −g ĵ − k·|v|·v  →  integrated numerically (Δt = 1/240 s)`
        : `t_flight = (v₀ᵧ + √(v₀ᵧ² + 2g·h₀)) / g = ${fmt(out.tof)} s`,
      `Range R = v₀ₓ · t_flight = ${fmt(out.range)} m`,
      `h_max = h₀ + v₀ᵧ² / 2g = ${fmt(out.maxH)} m`,
    ],
    result: `R = ${fmt(out.range)} m   •   h_max = ${fmt(out.maxH)} m   •   t = ${fmt(out.tof)} s   •   v_impact = ${fmt(out.vFinal)} m/s`,
    note: drag ? "Quadratic air drag — numerical integration, simplified educational model." : "Exact closed-form kinematics for vacuum flight.",
  });

  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 w-[min(23.5rem,calc(100vw-1.5rem))] md:bottom-4 md:left-3">
        <div className="pv-panel rounded-xl p-3">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <Stat label="Range" value={fmt(out.range, 1)} unit="m" accent="#ffb454" />
            <Stat label="Max height" value={fmt(out.maxH, 1)} unit="m" />
            <Stat label="Flight time" value={fmt(out.tof, 2)} unit="s" />
            <Stat label="Impact vel." value={fmt(out.vFinal, 1)} unit="m/s" />
          </div>
          <div className="mt-2 hidden grid-cols-2 gap-2 md:grid">
            <MiniChart data={dataH} color="#ffb454" label="Height vs time" />
            <MiniChart data={dataD} color="#53e8ff" label="Distance vs time" />
          </div>
        </div>
      </div>
      <ControlPanel
        title="Projectile Controls" color={META.color}
        footer={
          <>
            <Btn variant="primary" className="flex-1 !py-2 !text-[10px]" onClick={() => { bump("pj_run"); sfx.launch(); }}><Rocket size={12} /> Launch</Btn>
            <Btn variant="ghost" className="!px-3 !py-2 !text-[10px]" onClick={() => resetWorld()}><RotateCcw size={12} /></Btn>
          </>
        }
      >
        <Slider label="Initial velocity" unit="m/s" min={5} max={45} step={0.5} value={v0} onChange={(v) => setSim("pj_v0", v)} />
        <Slider label="Launch angle" unit="deg" min={10} max={80} step={1} value={ang} onChange={(v) => setSim("pj_ang", v)} />
        <Slider label="Gravity" unit="m/s²" min={1.62} max={24.8} step={0.01} value={g} onChange={(v) => setSim("pj_g", v)} />
        <div className="flex gap-1">
          {([["Moon", 1.62], ["Earth", 9.81], ["Jupiter", 24.79]] as [string, number][]).map(([n, gv]) => (
            <button key={n} onClick={() => { setSim("pj_g", gv); sfx.tick(); }}
              className={`flex-1 rounded border px-1 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${Math.abs(g - (gv as number)) < 0.05 ? "border-[rgba(255,180,84,0.5)] text-[#ffb454]" : "border-[rgba(96,145,255,0.14)] text-[#5a6d94] hover:text-[#8fa3c8]"}`}>
              {n}
            </button>
          ))}
        </div>
        <Slider label="Initial height" unit="m" min={0} max={15} step={0.5} value={h0} onChange={(v) => setSim("pj_h0", v)} />
        <Toggle label="Air resistance (F = −k·v·|v|)" value={drag} onChange={(v) => setSim("pj_drag", v)} />
        <EqButton onClick={showEq} />
      </ControlPanel>
    </>
  );
}

/* ================= Pendulum ================= */
function EnergyBars({ L, g, m, th0 }: { L: number; g: number; m: number; th0: number }) {
  const keRef = useRef<HTMLDivElement>(null);
  const peRef = useRef<HTMLDivElement>(null);
  const run = useStore((s) => s.sim.pn_run);
  useEffect(() => {
    let raf = 0;
    let th = (th0 * Math.PI) / 180;
    let om = 0;
    let last = performance.now();
    const E = Math.max(1e-9, m * g * L * (1 - Math.cos(th)));
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!useStore.getState().paused) {
        for (let i = 0; i < 3; i++) {
          const r = pendulumStep(th, om, L, g, dt / 3);
          th = r.th; om = r.om;
        }
      }
      const KE = 0.5 * m * (L * om) * (L * om);
      if (keRef.current) keRef.current.style.width = `${Math.min(100, (KE / E) * 100)}%`;
      if (peRef.current) peRef.current.style.width = `${Math.min(100, Math.max(0, ((E - KE) / E) * 100))}%`;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [L, g, m, th0, run]);
  const Bar = ({ label, color, refv }: { label: string; color: string; refv: React.RefObject<HTMLDivElement> }) => (
    <div>
      <div className="flex justify-between"><span className="label-xs !text-[8px]">{label}</span></div>
      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-[rgba(96,145,255,0.1)]">
        <div ref={refv} className="h-full rounded-full transition-[width] duration-75" style={{ background: color, width: "50%" }} />
      </div>
    </div>
  );
  return (
    <div className="space-y-1.5">
      <Bar label="Kinetic ½mL²ω²" color="#39f0c3" refv={keRef} />
      <Bar label="Potential mgL(1−cosθ)" color="#ffb454" refv={peRef} />
    </div>
  );
}

function PendulumUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const resetWorld = useStore((s) => s.resetWorld);
  const openEq = useStore((s) => s.openEq);
  const L = Number(sim.pn_L); const m = Number(sim.pn_m); const g = Number(sim.pn_g); const th0 = Number(sim.pn_th);
  const T = pendulumPeriod(L, g, (th0 * Math.PI) / 180);
  const E = m * g * L * (1 - Math.cos((th0 * Math.PI) / 180));
  const th0r = th0 * Math.PI / 180;
  const showEq = () => openEq({
    title: "Simple Pendulum",
    formula: "T = 2π√(L/g) · (1 + θ₀²/16 + 11θ₀⁴/3072)",
    vars: [["L", `${L} m`], ["m", `${m} kg`], ["g", `${g} m/s²`], ["θ₀", `${th0}° = ${fmt(th0r, 3)} rad`]],
    steps: [
      `T₀ = 2π√(${L}/${g}) = ${fmt(2 * Math.PI * Math.sqrt(L / g))} s  (small angle)`,
      `correction = 1 + ${fmt(th0r, 3)}²/16 = ${fmt(1 + (th0r * th0r) / 16, 4)}`,
      `T = ${fmt(T)} s   →   f = 1/T = ${fmt(1 / T, 3)} Hz`,
      `E_total = mgL(1 − cos θ₀) = ${m} × ${g} × ${L} × ${fmt(1 - Math.cos(th0r), 4)} = ${fmt(E)} J`,
    ],
    result: `T = ${fmt(T)} s   •   E = ${fmt(E)} J   (mass does not change T)`,
    note: "Large-angle series correction included; motion integrated numerically as θ̈ = −(g/L)sin θ.",
  });
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 w-[min(20rem,calc(100vw-1.5rem))] md:bottom-4">
        <div className="pv-panel space-y-2.5 rounded-xl p-3">
          <div className="grid grid-cols-3 gap-1.5">
            <Stat label="Period" value={fmt(T, 2)} unit="s" accent="#ffb454" />
            <Stat label="Frequency" value={fmt(1 / T, 2)} unit="Hz" />
            <Stat label="Energy" value={fmt(E, 2)} unit="J" />
          </div>
          <EnergyBars L={L} g={g} m={m} th0={th0} />
        </div>
      </div>
      <ControlPanel
        title="Pendulum Controls" color={META.color}
        footer={
          <>
            <Btn variant="primary" className="flex-1 !py-2 !text-[10px]" onClick={() => { useStore.getState().bump("pn_run"); sfx.launch(); }}><Play size={12} /> Release</Btn>
            <Btn variant="ghost" className="!px-3 !py-2 !text-[10px]" onClick={() => resetWorld()}><RotateCcw size={12} /></Btn>
          </>
        }
      >
        <Slider label="Length" unit="m" min={0.5} max={8} step={0.1} value={L} onChange={(v) => setSim("pn_L", v)} />
        <Slider label="Mass" unit="kg" min={0.2} max={5} step={0.1} value={m} onChange={(v) => setSim("pn_m", v)} />
        <Slider label="Gravity" unit="m/s²" min={1.62} max={24.8} step={0.01} value={g} onChange={(v) => setSim("pn_g", v)} />
        <Slider label="Initial angle" unit="deg" min={5} max={170} step={1} value={th0} onChange={(v) => setSim("pn_th", v)} />
        <EqButton onClick={showEq} />
      </ControlPanel>
    </>
  );
}

/* ================= Collision ================= */
function CollisionUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const bump = useStore((s) => s.bump);
  const resetWorld = useStore((s) => s.resetWorld);
  const openEq = useStore((s) => s.openEq);
  const mA = Number(sim.cl_mA); const mB = Number(sim.cl_mB);
  const vA = Number(sim.cl_vA); const vB = Number(sim.cl_vB);
  const el = Boolean(sim.cl_el);
  const out = useMemo(() => collide1D(mA, mB, vA, vB, el), [mA, mB, vA, vB, el]);
  const pMax = Math.max(Math.abs(out.pBefore), Math.abs(out.pAfter), 1);
  const kMax = Math.max(out.keBefore, out.keAfter, 1);
  const showEq = () => openEq({
    title: el ? "Elastic Collision" : "Perfectly Inelastic Collision",
    formula: el ? "m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′   (KE conserved)" : "m₁v₁ + m₂v₂ = (m₁ + m₂)v′",
    vars: [["m₁", `${mA} kg`], ["m₂", `${mB} kg`], ["v₁", `${vA} m/s`], ["v₂", `${vB} m/s`]],
    steps: el
      ? [
        `p_before = ${mA}×${vA} + ${mB}×${vB} = ${fmt(out.pBefore)} kg·m/s`,
        `v₁′ = ((m₁−m₂)v₁ + 2m₂v₂)/(m₁+m₂) = ${fmt(out.v1p)} m/s`,
        `v₂′ = ((m₂−m₁)v₂ + 2m₁v₁)/(m₁+m₂) = ${fmt(out.v2p)} m/s`,
        `KE_before = ½m₁v₁² + ½m₂v₂² = ${fmt(out.keBefore)} J`,
      ]
      : [
        `p_before = ${mA}×${vA} + ${mB}×${vB} = ${fmt(out.pBefore)} kg·m/s`,
        `v′ = p / (m₁+m₂) = ${fmt(out.pBefore)} / ${fmt(mA + mB)} = ${fmt(out.v1p)} m/s`,
        `KE_before = ${fmt(out.keBefore)} J  →  KE_after = ${fmt(out.keAfter)} J`,
        `ΔKE = ${fmt(out.keAfter - out.keBefore)} J  (lost to heat / deformation)`,
      ],
    result: `p: ${fmt(out.pBefore)} → ${fmt(out.pAfter)} kg·m/s   •   KE: ${fmt(out.keBefore)} → ${fmt(out.keAfter)} J`,
    note: el ? "Momentum AND kinetic energy conserved." : "Momentum conserved; kinetic energy is not — that's what makes it inelastic.",
  });
  const BarRow = ({ label, a, b, max, color }: { label: string; a: number; b: number; max: number; color: string }) => (
    <div>
      <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider text-[#5a6d94]"><span>{label}</span><span className="text-[#8fa3c8]">{fmt(a, 1)} → {fmt(b, 1)}</span></div>
      <div className="mt-0.5 space-y-0.5">
        <div className="h-1.5 rounded-full bg-[rgba(96,145,255,0.1)]"><div className="h-full rounded-full" style={{ width: `${(Math.abs(a) / max) * 100}%`, background: color }} /></div>
        <div className="h-1.5 rounded-full bg-[rgba(96,145,255,0.1)]"><div className="h-full rounded-full" style={{ width: `${(Math.abs(b) / max) * 100}%`, background: color, opacity: 0.65 }} /></div>
      </div>
    </div>
  );
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 w-[min(21rem,calc(100vw-1.5rem))] md:bottom-4">
        <div className="pv-panel space-y-2.5 rounded-xl p-3">
          <div className="grid grid-cols-2 gap-1.5">
            <Stat label="v₁ after" value={fmt(out.v1p, 2)} unit="m/s" accent="#ffb454" />
            <Stat label="v₂ after" value={fmt(out.v2p, 2)} unit="m/s" accent="#53e8ff" />
          </div>
          <BarRow label="Momentum before → after" a={out.pBefore} b={out.pAfter} max={pMax} color="#53e8ff" />
          <BarRow label="Kinetic energy before → after" a={out.keBefore} b={out.keAfter} max={kMax} color="#ffb454" />
        </div>
      </div>
      <ControlPanel
        title="Collision Controls" color={META.color}
        footer={
          <>
            <Btn variant="primary" className="flex-1 !py-2 !text-[10px]" onClick={() => { bump("cl_run"); sfx.launch(); }}><Rocket size={12} /> Collide</Btn>
            <Btn variant="ghost" className="!px-3 !py-2 !text-[10px]" onClick={() => resetWorld()}><RotateCcw size={12} /></Btn>
          </>
        }
      >
        <Slider label="Mass A (amber)" unit="kg" min={0.5} max={10} step={0.1} value={mA} onChange={(v) => setSim("cl_mA", v)} />
        <Slider label="Mass B (cyan)" unit="kg" min={0.5} max={10} step={0.1} value={mB} onChange={(v) => setSim("cl_mB", v)} />
        <Slider label="Velocity A" unit="m/s" min={-10} max={10} step={0.1} value={vA} onChange={(v) => setSim("cl_vA", v)} />
        <Slider label="Velocity B" unit="m/s" min={-10} max={10} step={0.1} value={vB} onChange={(v) => setSim("cl_vB", v)} />
        <Seg options={[{ id: "el", label: "Elastic" }, { id: "in", label: "Inelastic" }]} value={el ? "el" : "in"} onChange={(v) => setSim("cl_el", v === "el")} />
        <EqButton onClick={showEq} />
      </ControlPanel>
    </>
  );
}

export default function MechanicsWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "projectile" && <ProjectileUI />}
      {exp === "pendulum" && <PendulumUI />}
      {exp === "collision" && <CollisionUI />}
    </div>
  );
}
