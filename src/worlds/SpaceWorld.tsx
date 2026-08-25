import { useMemo } from "react";
import { Rocket, RotateCcw } from "lucide-react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, Btn, EqButton } from "../components/ui";
import { G, C_LIGHT, M_EARTH, R_EARTH, gravityForce, orbitPath, circularOrbit, escapePath, fmt } from "../physics";
import { sfx } from "../sfx";

const META = WORLDS.find((w) => w.id === "space")!;
const M_SUN = 1.989e30;

/* ================= Gravity lab ================= */
function GravityUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const mFac = Number(sim.gr_m); const dFac = Number(sim.gr_d);
  const mB = mFac * 1e23; const d = dFac * 1e6;
  const F = gravityForce(M_EARTH, mB, d);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 w-[min(21rem,calc(100vw-1.5rem))] md:bottom-4">
        <div className="pv-panel rounded-xl p-3">
          <div className="grid grid-cols-2 gap-1.5">
            <Stat label="Force (both bodies)" value={F.toExponential(2)} unit="N" accent="#7ab8ff" />
            <Stat label="g at that distance" value={fmt((G * M_EARTH) / (d * d), 3)} unit="m/s²" />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#5a6d94]">Equal and opposite — Newton's third law. The arrows scale with F ∝ 1/r².</p>
        </div>
      </div>
      <ControlPanel
        title="Gravity Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Newton's Law of Gravitation",
          formula: "F = G·m₁·m₂ / r²",
          vars: [["G", "6.674 × 10⁻¹¹ N·m²/kg²"], ["m₁ (Earth)", "5.972 × 10²⁴ kg"], ["m₂", `${mFac} × 10²³ kg`], ["r", `${dFac} × 10⁶ m`]],
          steps: [
            `F = (6.674×10⁻¹¹ × 5.972×10²⁴ × ${mFac}×10²³) / (${dFac}×10⁶)²`,
            `F = ${(G * M_EARTH * mB).toExponential(3)} / ${(d * d).toExponential(3)}`,
            `F = ${F.toExponential(3)} N`,
          ],
          result: `F = ${F.toExponential(3)} N`,
          note: "Double the distance → force drops to a quarter. Inverse-square, exactly like Coulomb's law.",
        })} />}
      >
        <Slider label="Mass B" unit="×10²³ kg" min={0.5} max={8} step={0.1} value={mFac} onChange={(x) => setSim("gr_m", x)} />
        <Slider label="Separation" unit="×10⁶ m" min={4} max={24} step={0.5} value={dFac} onChange={(x) => setSim("gr_d", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="F on B" value={F.toExponential(1)} unit="N" accent="#53e8ff" />
          <Stat label="F on Earth" value={F.toExponential(1)} unit="N" accent="#ffb454" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Satellite ================= */
function SatelliteUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const bump = useStore((s) => s.bump);
  const openEq = useStore((s) => s.openEq);
  const alt = Number(sim.st_alt); const v = Number(sim.st_v);
  const path = useMemo(() => orbitPath(alt, v), [alt, v]);
  const co = useMemo(() => circularOrbit(alt), [alt]);
  const vc = co.v / 1000;
  const outcomeLabel = path.outcome === "orbit" ? "STABLE ORBIT" : path.outcome === "crash" ? "RE-ENTRY" : "ESCAPE";
  const outcomeColor = path.outcome === "orbit" ? "#39f0c3" : path.outcome === "crash" ? "#ff7a9c" : "#ffb454";
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 w-[min(23rem,calc(100vw-1.5rem))] md:bottom-4">
        <div className="pv-panel rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-xs">Trajectory</span>
            <span className="num rounded border px-2 py-0.5 text-[11px]" style={{ color: outcomeColor, borderColor: `${outcomeColor}55`, background: `${outcomeColor}14` }}>{outcomeLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Stat label="Circular v required" value={fmt(vc, 2)} unit="km/s" accent="#7ab8ff" />
            <Stat label="Period (if bound)" value={fmt(co.T / 60, 1)} unit="min" />
            <Stat label="Perigee" value={fmt(path.rMin / 1000 - R_EARTH / 1000, 0)} unit="km alt" />
            <Stat label="Apogee" value={fmt(path.rMax / 1000 - R_EARTH / 1000, 0)} unit="km alt" />
          </div>
        </div>
      </div>
      <ControlPanel
        title="Orbit Controls" color={META.color}
        footer={
          <>
            <Btn variant="primary" className="flex-1 !py-2 !text-[10px]" onClick={() => { bump("st_run"); sfx.launch(); }}><Rocket size={12} /> Set Orbit</Btn>
            <Btn variant="ghost" className="!px-3 !py-2 !text-[10px]" onClick={() => useStore.getState().resetWorld()}><RotateCcw size={12} /></Btn>
          </>
        }
      >
        <Slider label="Altitude" unit="km" min={200} max={2000} step={10} value={alt} onChange={(x) => setSim("st_alt", x)} />
        <Slider label="Tangential velocity" unit="km/s" min={5} max={12} step={0.01} value={v} onChange={(x) => setSim("st_v", x)} />
        <button
          onClick={() => { setSim("st_v", +vc.toFixed(2)); sfx.tick(); }}
          className="w-full rounded border border-[rgba(57,240,195,0.35)] bg-[rgba(57,240,195,0.07)] py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#39f0c3] transition-colors hover:bg-[rgba(57,240,195,0.14)]"
        >
          Auto-set circular velocity ({fmt(vc, 2)} km/s)
        </button>
        <EqButton onClick={() => openEq({
          title: "Circular Orbit",
          formula: "v = √(GM/r)     T = 2π√(r³/GM)",
          vars: [["G·M⊕", "3.986 × 10¹⁴ m³/s²"], ["r", `R⊕ + ${alt} km = ${fmt(co.r / 1e6, 3)} × 10⁶ m`], ["v set", `${v} km/s`]],
          steps: [
            `gravity = centripetal: GM/r² = v²/r`,
            `v = √(3.986×10¹⁴ / ${fmt(co.r, 0)}) = ${fmt(vc, 3)} km/s`,
            `T = 2πr/v = ${fmt(co.T, 0)} s = ${fmt(co.T / 60, 1)} min`,
            path.outcome !== "orbit" ? `your v = ${v} km/s ≠ ${fmt(vc, 2)} → ${outcomeLabel.toLowerCase()}` : `your v matches → closed orbit`,
          ],
          result: `v_circ = ${fmt(vc, 2)} km/s   •   T = ${fmt(co.T / 60, 1)} min`,
          note: "The 3D path is numerically integrated (velocity Verlet) from a = −GM·r̂/r² — not scripted.",
        })} />
      </ControlPanel>
    </>
  );
}

/* ================= Escape velocity ================= */
function EscapeUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const bump = useStore((s) => s.bump);
  const openEq = useStore((s) => s.openEq);
  const v = Number(sim.es_v);
  const ep = useMemo(() => escapePath(v), [v]);
  const ve = ep.ve / 1000;
  const label = ep.outcome === "escape" ? "ESCAPES EARTH" : ep.outcome === "margin" ? "MARGINAL — coasts to ∞ at v≈0" : "FALLS BACK";
  const color = ep.outcome === "escape" ? "#39f0c3" : ep.outcome === "margin" ? "#ffb454" : "#ff7a9c";
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 w-[min(21rem,calc(100vw-1.5rem))] md:bottom-4">
        <div className="pv-panel rounded-xl p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="label-xs">Outcome</span>
            <span className="num rounded border px-2 py-0.5 text-[11px]" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>{label}</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <Stat label="Escape velocity" value={fmt(ve, 2)} unit="km/s" accent="#7ab8ff" />
            <Stat label="v / vₑ" value={fmt(v / ve, 3)} unit="×" accent={color} />
          </div>
        </div>
      </div>
      <ControlPanel
        title="Rocket Controls" color={META.color}
        footer={
          <>
            <Btn variant="primary" className="flex-1 !py-2 !text-[10px]" onClick={() => { bump("es_run"); sfx.launch(); }}><Rocket size={12} /> Launch</Btn>
            <Btn variant="ghost" className="!px-3 !py-2 !text-[10px]" onClick={() => useStore.getState().resetWorld()}><RotateCcw size={12} /></Btn>
          </>
        }
      >
        <Slider label="Launch velocity" unit="km/s" min={4} max={16} step={0.05} value={v} onChange={(x) => setSim("es_v", x)} />
        <button onClick={() => { setSim("es_v", +ve.toFixed(2)); sfx.tick(); }}
          className="w-full rounded border border-[rgba(255,180,84,0.35)] bg-[rgba(255,180,84,0.07)] py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[#ffb454] transition-colors hover:bg-[rgba(255,180,84,0.14)]">
          Set exactly vₑ ({fmt(ve, 2)} km/s)
        </button>
        <EqButton onClick={() => openEq({
          title: "Escape Velocity",
          formula: "vₑ = √(2GM/R)",
          vars: [["G·M⊕", "3.986 × 10¹⁴ m³/s²"], ["R⊕", "6.371 × 10⁶ m"], ["v set", `${v} km/s`]],
          steps: [
            `½mv² = GMm/R  (kinetic = gravitational binding)`,
            `vₑ = √(2 × 3.986×10¹⁴ / 6.371×10⁶)`,
            `vₑ = ${fmt(ve, 3)} km/s`,
            `your v/vₑ = ${fmt(v / ve, 3)} → ${label.toLowerCase()}`,
          ],
          result: `vₑ = ${fmt(ve, 2)} km/s from Earth's surface`,
          note: "Energy argument — mass of the rocket cancels. The flight path is integrated from a = −GM/r².",
        })} />
      </ControlPanel>
    </>
  );
}

/* ================= Black hole ================= */
function BlackholeUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const M = Number(sim.bh_m);
  const Mkg = M * M_SUN;
  const Rs = (2 * G * Mkg) / (C_LIGHT * C_LIGHT); // m
  const rISCO = 3 * Rs;
  const vFrac = Math.sqrt(Rs / (2 * rISCO)); // v/c at ISCO
  const TISCO = 2 * Math.PI * Math.sqrt((rISCO ** 3) / (G * Mkg));
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 w-[min(22rem,calc(100vw-1.5rem))] md:bottom-4">
        <div className="pv-panel rounded-xl p-3">
          <div className="grid grid-cols-2 gap-1.5">
            <Stat label="Schwarzschild Rₛ" value={fmt(Rs / 1000, 1)} unit="km" accent="#ffb454" />
            <Stat label="v at inner disk" value={fmt(vFrac, 2)} unit="× c" />
            <Stat label="Orbit period @3Rₛ" value={TISCO < 1 ? fmt(TISCO * 1000, 1) + " ms" : fmt(TISCO, 2)} unit="s" />
            <Stat label="Mass" value={fmt(M, 0)} unit="M☉" />
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#5a6d94]">
            Simplified educational visualization — Rₛ and Keplerian disk speeds are real; light-bending is not simulated (full GR would require ray tracing).
          </p>
        </div>
      </div>
      <ControlPanel
        title="Singularity Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Event Horizon",
          formula: "Rₛ = 2GM / c²",
          vars: [["G", "6.674 × 10⁻¹¹"], ["M", `${M} M☉ = ${Mkg.toExponential(2)} kg`], ["c", "2.998 × 10⁸ m/s"]],
          steps: [
            `Rₛ = 2 × 6.674×10⁻¹¹ × ${Mkg.toExponential(2)} / (2.998×10⁸)²`,
            `Rₛ = ${Rs.toExponential(3)} m = ${fmt(Rs / 1000, 1)} km`,
            `at r = 3Rₛ (ISCO): v = c·√(Rₛ/2r) = ${fmt(vFrac, 2)}c`,
          ],
          result: `Rₛ = ${fmt(Rs / 1000, 1)} km  — inside this radius, even light is bound`,
          note: "The glowing ring marks the photon sphere at 1.5 Rₛ. Disk particles orbit with Keplerian ω ∝ r^(-3/2).",
        })} />}
      >
        <Slider label="Black hole mass" unit="solar masses" min={4} max={40} step={1} value={M} onChange={(x) => setSim("bh_m", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Rₛ" value={fmt(Rs / 1000, 1)} unit="km" accent="#ffb454" />
          <Stat label="Photon sphere" value={fmt((1.5 * Rs) / 1000, 1)} unit="km" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">For comparison: a 10 M☉ black hole has Rₛ ≈ 30 km. Sagittarius A* (4.3×10⁶ M☉) → ≈ 12.7 million km.</p>
      </ControlPanel>
    </>
  );
}

export default function SpaceWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "gravity" && <GravityUI />}
      {exp === "satellite" && <SatelliteUI />}
      {exp === "escape" && <EscapeUI />}
      {exp === "blackhole" && <BlackholeUI />}
    </div>
  );
}
