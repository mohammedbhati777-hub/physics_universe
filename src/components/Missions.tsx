import { useState } from "react";
import { Target, Rocket, Moon, Zap, Eye, Waves as WavesIcon, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { useStore } from "../store";
import { Sheet, Slider, Btn, openPanel } from "./ui";
import { circularOrbit, projectile, K_E, refract, fmt, clamp } from "../physics";
import { sfx } from "../sfx";

interface Mission {
  id: string; icon: React.ReactNode; title: string; world: string; expName: string;
  objective: string; detail: string; target: string; xp: number;
  control: { label: string; unit: string; min: number; max: number; step: number; def: number };
  fixed: [string, string][];
  check: (v: number) => { pass: boolean; actual: string; accuracy: number; explanation: string };
  go: { world: "space" | "mechanics" | "electricity" | "optics" | "waves"; exp: string };
}

const MISSIONS: Mission[] = [
  {
    id: "m1", icon: <Rocket size={14} />, title: "MISSION 01 — Stable Orbit", world: "SPACE", expName: "Satellite Orbit",
    objective: "Set the tangential velocity that produces a circular orbit at 400 km altitude.",
    detail: "A circular orbit needs exactly v = √(GM/r). Too slow → re-entry. Too fast → an ellipse or escape.",
    target: "v within 3% of circular velocity", xp: 500,
    control: { label: "Satellite velocity", unit: "km/s", min: 5, max: 12, step: 0.01, def: 7.0 },
    fixed: [["Altitude", "400 km"], ["Earth mass", "5.972 × 10²⁴ kg"]],
    check: (v) => {
      const vc = circularOrbit(400).v / 1000;
      const diff = Math.abs(v - vc) / vc;
      return {
        pass: diff < 0.03, actual: `${fmt(v, 2)} km/s (need ${fmt(vc, 2)})`,
        accuracy: Math.round(clamp(100 - diff * 900, 55, 99)),
        explanation: `At r = R⊕ + 400 km, gravity provides exactly the centripetal acceleration when v = √(GM/r) ≈ ${fmt(vc, 2)} km/s. The satellite falls around Earth instead of into it.`,
      };
    },
    go: { world: "space", exp: "satellite" },
  },
  {
    id: "m2", icon: <Moon size={14} />, title: "MISSION 02 — Moon Jump", world: "MECHANICS", expName: "Projectile Motion",
    objective: "On the Moon (g = 1.62 m/s²) with v₀ = 8 m/s, pick the launch angle that lands exactly 30 m away.",
    detail: "Range R = v₀² sin(2θ) / g. Two angles always work — find one of them.",
    target: "Range = 30 m ± 1.5 m", xp: 400,
    control: { label: "Launch angle", unit: "deg", min: 5, max: 85, step: 0.5, def: 15 },
    fixed: [["v₀", "8 m/s"], ["Gravity", "1.62 m/s² (Moon)"]],
    check: (a) => {
      const out = projectile(8, a, 1.62, 0, false);
      const diff = Math.abs(out.range - 30);
      return {
        pass: diff < 1.5, actual: `Range ${fmt(out.range, 1)} m`,
        accuracy: Math.round(clamp(100 - (diff / 1.5) * 12, 55, 99)),
        explanation: `R = 64·sin(2θ)/1.62. For R = 30 m, sin(2θ) ≈ 0.759 → θ ≈ 24.7° or 65.3°. Same range, two trajectories — complementary angles.`,
      };
    },
    go: { world: "mechanics", exp: "projectile" },
  },
  {
    id: "m3", icon: <Zap size={14} />, title: "MISSION 03 — Target Field", world: "ELECTRICITY", expName: "Electric Field",
    objective: "Choose the charge Q so the electric field measures exactly 5 000 N/C at 2 m distance.",
    detail: "Coulomb field: E = kQ/r². Rearrange for Q.",
    target: "E = 5 000 N/C ± 5%", xp: 400,
    control: { label: "Charge Q", unit: "µC", min: 0.1, max: 8, step: 0.01, def: 1 },
    fixed: [["Distance", "2 m"], ["k", "8.988 × 10⁹ N·m²/C²"]],
    check: (q) => {
      const E = (K_E * q * 1e-6) / 4;
      const diff = Math.abs(E - 5000) / 5000;
      return {
        pass: diff < 0.05, actual: `E = ${fmt(E, 0)} N/C`,
        accuracy: Math.round(clamp(100 - diff * 600, 55, 99)),
        explanation: `Q = E·r²/k = 5000 × 4 / 8.988×10⁹ ≈ 2.23 µC. Field strength falls with r², so doubling distance quarters it.`,
      };
    },
    go: { world: "electricity", exp: "field" },
  },
  {
    id: "m4", icon: <Eye size={14} />, title: "MISSION 04 — Snell's Target", world: "OPTICS", expName: "Refraction",
    objective: "Light enters glass (n = 1.50) from air. Find the incidence angle that refracts at exactly 28°.",
    detail: "n₁ sin θ₁ = n₂ sin θ₂ — solve for θ₁.",
    target: "θ₂ = 28° ± 1°", xp: 350,
    control: { label: "Incidence angle θ₁", unit: "deg", min: 10, max: 80, step: 0.5, def: 30 },
    fixed: [["n₁ (air)", "1.00"], ["n₂ (glass)", "1.50"]],
    check: (th1) => {
      const r = refract(1, 1.5, th1);
      const diff = Math.abs(r.th2Deg - 28);
      return {
        pass: !r.tir && diff < 1, actual: `θ₂ = ${r.tir ? "TIR" : fmt(r.th2Deg, 1) + "°"}`,
        accuracy: Math.round(clamp(100 - diff * 10, 55, 99)),
        explanation: `sin θ₁ = 1.5 × sin 28° ≈ 0.704 → θ₁ ≈ 44.7°. Light slows in glass, so it bends toward the normal (θ₂ < θ₁).`,
      };
    },
    go: { world: "optics", exp: "refraction" },
  },
  {
    id: "m5", icon: <WavesIcon size={14} />, title: "MISSION 05 — Perfect Constructive", world: "WAVES", expName: "Interference",
    objective: "Two identical sources. Tune their phase difference so waves arrive perfectly in step.",
    detail: "Constructive interference: Δφ = 0, 2π, 4π… (0°, 360°, …).",
    target: "Δφ within 12° of 0° / 360°", xp: 350,
    control: { label: "Phase difference Δφ", unit: "deg", min: 0, max: 360, step: 1, def: 90 },
    fixed: [["Frequencies", "identical"], ["Path difference", "0 (midline)"]],
    check: (ph) => {
      const d = Math.min(ph % 360, 360 - (ph % 360));
      return {
        pass: d < 12, actual: `Δφ = ${fmt(ph, 0)}° (offset ${fmt(d, 0)}°)`,
        accuracy: Math.round(clamp(100 - (d / 12) * 12, 55, 99)),
        explanation: `At Δφ = 0 the crests align: amplitudes add to 2A and intensity to 4I. At 180° they cancel completely — the same pattern of bright and dark fringes Young measured in 1801.`,
      };
    },
    go: { world: "waves", exp: "interference" },
  },
];

interface Result { pass: boolean; actual: string; accuracy: number; explanation: string }

export default function Missions() {
  const open = useStore((s) => s.missionsOpen);
  const setPanel = useStore((s) => s.setPanel);
  const done = useStore((s) => s.missionsDone);
  const completeMission = useStore((s) => s.completeMission);
  const enterWorld = useStore((s) => s.enterWorld);
  const setExp = useStore((s) => s.setExp);
  const [values, setValues] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, Result>>({});
  const [expanded, setExpanded] = useState<string | null>("m1");

  if (!open) return null;

  return (
    <Sheet title="Physics Missions" icon={<Target size={14} className="text-[#ffb454]" />} accent="#ffb454" onClose={() => setPanel("missionsOpen", false)} wide>
      <p className="mb-3 text-[11px] leading-relaxed text-[#8fa3c8]">
        Real objectives solved with real equations. Pass a check to earn XP — then open the full simulator and push further.
      </p>
      <div className="space-y-2.5">
        {MISSIONS.map((m) => {
          const isDone = done.includes(m.id);
          const val = values[m.id] ?? m.control.def;
          const res = results[m.id];
          const isExp = expanded === m.id;
          return (
            <div key={m.id} className={`overflow-hidden rounded-lg border transition-colors ${isDone ? "border-[rgba(57,240,195,0.35)]" : "border-[rgba(96,145,255,0.14)]"} bg-[rgba(7,11,22,0.65)]`}>
              <button
                onClick={() => { setExpanded(isExp ? null : m.id); sfx.tick(); }}
                className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
                aria-expanded={isExp}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isDone ? "text-[#39f0c3]" : "text-[#ffb454]"}>{isDone ? <CheckCircle2 size={15} /> : m.icon}</span>
                  <div>
                    <div className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-[#e9f1ff]">{m.title}</div>
                    <div className="text-[10px] text-[#5a6d94]">{m.world} • {m.expName} • +{m.xp} XP</div>
                  </div>
                </div>
                <span className={`num text-[10px] ${isDone ? "text-[#39f0c3]" : "text-[#5a6d94]"}`}>{isDone ? "COMPLETE" : "ACTIVE"}</span>
              </button>
              {isExp ? (
                <div className="border-t border-[rgba(96,145,255,0.1)] px-3.5 py-3">
                  <p className="text-[12px] leading-relaxed text-[#c6d6f5]">{m.objective}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {m.fixed.map(([k, v]) => (
                      <div key={k} className="flex justify-between rounded border border-[rgba(96,145,255,0.1)] px-2 py-1">
                        <span className="text-[10px] text-[#5a6d94]">{k}</span>
                        <span className="num text-[10px] text-[#8fa3c8]">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Slider label={m.control.label} unit={m.control.unit} min={m.control.min} max={m.control.max} step={m.control.step}
                      value={val} onChange={(v) => setValues((s) => ({ ...s, [m.id]: v }))} />
                  </div>
                  <p className="mt-1 text-[10px] text-[#5a6d94]">Success condition: {m.target}</p>
                  <div className="mt-2.5 flex gap-2">
                    <Btn variant="primary" className="!px-4 !py-2 !text-[10px]" onClick={() => {
                      const r = m.check(val);
                      setResults((s) => ({ ...s, [m.id]: r }));
                      if (r.pass) { completeMission(m.id, m.xp); sfx.success(); } else sfx.fail();
                    }}>Run Check</Btn>
                    <Btn variant="ghost" className="!px-4 !py-2 !text-[10px]" onClick={() => { enterWorld(m.go.world); setExp(m.go.exp); setPanel("missionsOpen", false); }}>
                      Open Simulator <ArrowRight size={12} />
                    </Btn>
                  </div>
                  {res ? (
                    <div className={`anim-fade-up mt-3 rounded-lg border p-3 ${res.pass ? "border-[rgba(57,240,195,0.4)] bg-[rgba(57,240,195,0.07)]" : "border-[rgba(255,122,156,0.4)] bg-[rgba(255,122,156,0.06)]"}`}>
                      <div className="flex items-center gap-2">
                        {res.pass ? <CheckCircle2 size={15} className="text-[#39f0c3]" /> : <XCircle size={15} className="text-[#ff7a9c]" />}
                        <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: res.pass ? "#39f0c3" : "#ff7a9c" }}>
                          {res.pass ? "Mission Complete" : "Not Yet"}
                        </span>
                        <span className="num ml-auto text-[11px] text-[#8fa3c8]">{res.actual}</span>
                      </div>
                      {res.pass ? (
                        <div className="num mt-2 grid grid-cols-2 gap-1.5 text-[12px]">
                          <div className="rounded bg-[rgba(57,240,195,0.1)] px-2 py-1.5">Physics accuracy <span className="text-[#39f0c3]">{res.accuracy}%</span></div>
                          <div className="rounded bg-[rgba(57,240,195,0.1)] px-2 py-1.5">Reward <span className="text-[#39f0c3]">+{m.xp} XP</span></div>
                        </div>
                      ) : null}
                      <p className="mt-2 text-[11px] leading-relaxed text-[#aebfe0]">{res.explanation}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <button onClick={() => openPanel("progressOpen")} className="mt-3 w-full rounded-md border border-[rgba(96,145,255,0.14)] py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8fa3c8] hover:text-[#53e8ff]">
        View progress & achievements →
      </button>
    </Sheet>
  );
}
