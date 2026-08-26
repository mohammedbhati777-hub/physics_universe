import { Suspense, lazy, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Clapperboard, Compass } from "lucide-react";
import PhysicsCanvas from "./three/Universe";
import HUD from "./components/HUD";
import EquationPanel from "./components/EquationPanel";
import PhyX from "./components/PhyX";
import Missions from "./components/Missions";
import ProgressPanel from "./components/ProgressPanel";
import { Loader } from "./components/ui";
import { useStore, WORLDS, WorldId, EqPayload } from "./store";
import { sfx, setSfxEnabled } from "./sfx";
import { initVoice, setVoiceEnabled } from "./voice";
import { projectile, fmt } from "./physics";

const MechanicsWorld = lazy(() => import("./worlds/MechanicsWorld"));
const ElectricityWorld = lazy(() => import("./worlds/ElectricityWorld"));
const WavesWorld = lazy(() => import("./worlds/WavesWorld"));
const OpticsWorld = lazy(() => import("./worlds/OpticsWorld"));
const SpaceWorld = lazy(() => import("./worlds/SpaceWorld"));
const QuantumWorld = lazy(() => import("./worlds/QuantumWorld"));
const GravityWorld = lazy(() => import("./worlds/GravityWorld"));
const ThermoWorld = lazy(() => import("./worlds/ThermoWorld"));
const FluidsWorld = lazy(() => import("./worlds/FluidsWorld"));
const ModernWorld = lazy(() => import("./worlds/ModernWorld"));

/* ---------------- Expo demo controller ---------------- */
function useDemo() {
  const demo = useStore((s) => s.demo);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    if (!demo) {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      return;
    }
    const S = () => useStore.getState();
    const at = (sec: number, fn: () => void) =>
      timers.current.push(window.setTimeout(() => { if (useStore.getState().demo) fn(); }, sec * 1000));

    at(0.3, () => S().setDemoCaption("Welcome to PHYSICSVERSE — every animation in this universe is a real equation."));
    at(6, () => { S().begin(); S().setDemoCaption("Ten worlds. Thirty-one experiments. One universe of physics."); });
    at(13, () => { S().enterWorld("mechanics"); S().setDemoCaption("MECHANICS — a projectile under gravity, integrated in real time."); });
    at(16, () => { S().sims({ pj_v0: 24, pj_ang: 58, pj_g: 9.81, pj_h0: 1.5, pj_drag: false }); S().bump("pj_run"); });
    at(24, () => {
      const out = projectile(24, 58, 9.81, 1.5, false);
      const eq: EqPayload = {
        title: "Projectile Motion",
        formula: "R = v₀cosθ · t     y(t) = v₀sinθ·t − ½gt²",
        vars: [["v₀", "24 m/s"], ["θ", "58°"], ["g", "9.81 m/s²"]],
        steps: [
          `v₀ᵧ = 24·sin 58° = ${fmt(24 * Math.sin((58 * Math.PI) / 180))} m/s`,
          `t_flight = ${fmt(out.tof)} s`,
          `R = 24·cos 58° × ${fmt(out.tof)} = ${fmt(out.range)} m`,
        ],
        result: `Range = ${fmt(out.range)} m  •  h_max = ${fmt(out.maxH)} m`,
        note: "Exact kinematics — the 3D arc is this calculation, drawn live.",
      };
      S().openEq(eq);
      S().setDemoCaption("SHOW THE PHYSICS — the numbers behind the arc.");
    });
    at(33, () => {
      S().closeEq();
      S().enterWorld("electricity");
      S().setDemoCaption("ELECTRICITY — field lines computed live from E = kQ/r². Superposition does the rest.");
    });
    at(47, () => { S().enterWorld("waves"); S().setExp("interference"); S().setDemoCaption("WAVES — two coherent sources. Bright bands: crests meet crests."); });
    at(60, () => { S().enterWorld("optics"); S().setExp("refraction"); S().sims({ rr_n1: 1, rr_n2: 1.5, rr_th: 45 }); S().setDemoCaption("OPTICS — Snell's law bends the ray in real time: n₁sinθ₁ = n₂sinθ₂."); });
    at(73, () => { S().enterWorld("space"); S().setExp("satellite"); S().sims({ st_alt: 400, st_v: 7.67 }); S().bump("st_run"); S().setDemoCaption("SPACE — a satellite falling around Earth at 7.67 km/s. That's the ISS."); });
    at(88, () => { S().setExp("blackhole"); S().setDemoCaption("A black hole's event horizon sits at Rₛ = 2GM/c² (simplified educational model)."); });
    at(102, () => { S().enterWorld("quantum"); S().sims({ ds_wave: false }); S().setDemoCaption("QUANTUM — particles detected one at a time on the screen…"); });
    at(108, () => { S().sims({ ds_wave: true }); S().setDemoCaption("…yet they land exactly where the wave |ψ₁ + ψ₂|² is bright."); });
    at(120, () => { S().leaveWorld(); S().setDemoCaption("Missions, XP and PHY-X are waiting. Don't just study physics — enter it."); });
    at(131, () => S().stopDemo());
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
  }, [demo]);
}

/* ---------------- Landing ---------------- */
function Landing() {
  const begin = useStore((s) => s.begin);
  const startDemo = useStore((s) => s.startDemo);
  const words = ["Explore.", "Experiment.", "Understand."];
  return (
    <motion.div
      initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.8 } }}
      className="pointer-events-none absolute inset-0 z-20"
    >
      <div className="hud-corners absolute inset-3 rounded-xl border border-[rgba(96,145,255,0.1)]" />
      <div className="pointer-events-auto absolute bottom-[10vh] left-5 max-w-2xl sm:left-12 sm:bottom-[12vh]">
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="font-mono text-[11px] uppercase tracking-[0.5em] text-[#53e8ff]"
        >
          Welcome to
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, type: "spring", stiffness: 90, damping: 18 }}
          className="font-display mt-3 text-[15vw] font-black leading-[0.95] tracking-[0.02em] text-[#e9f1ff] sm:text-7xl lg:text-[5.6rem]"
          style={{ textShadow: "0 0 60px rgba(83,232,255,0.25)" }}
        >
          PHYSICS<span className="text-[#53e8ff]">VERSE</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-3 max-w-md text-[13px] text-[#8fa3c8] sm:text-[15px]"
        >
          A 3D interactive universe of physics — enter the worlds, bend the variables, watch the equations move.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-4 space-y-1">
          {words.map((w, i) => (
            <motion.div
              key={w} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.1 + i * 0.22 }}
              className="font-mono text-[12px] uppercase tracking-[0.34em]"
              style={{ paddingLeft: `${i * 18}px`, color: i === 2 ? "#39f0c3" : "#5a6d94" }}
            >
              {w}
            </motion.div>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.85 }} className="mt-7 flex flex-wrap items-center gap-3">
          <button
            className="pv-btn-primary !px-7 !py-3.5 !text-[13px]"
            onClick={() => { sfx.enter(); begin(); }}
          >
            Enter the Universe <ChevronRight size={15} />
          </button>
          <button className="pv-btn-ghost !px-4 !py-3 !text-[10px]" onClick={() => { sfx.tick(); startDemo(); }}>
            <Clapperboard size={13} className="text-[#ffb454]" /> Expo Demo
          </button>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}
        className="absolute bottom-6 left-5 right-5 flex items-end justify-between sm:left-12 sm:right-12"
      >
        <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-[#3a4a70]">
          10 worlds / 31 experiments / real SI equations
        </div>
        <div className="anim-pulse font-mono text-[9px] uppercase tracking-[0.3em] text-[#5a6d94]">
          drag to look around
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Universe hover card ---------------- */
function HoverCard() {
  const hover = useStore((s) => s.hover);
  const enterWorld = useStore((s) => s.enterWorld);
  if (!hover) return null;
  const meta = WORLDS.find((w) => w.id === hover);
  if (!meta) return null;
  return (
    <motion.div
      key={hover}
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.25 }}
      className="pointer-events-auto absolute bottom-6 left-5 z-20 sm:left-8"
    >
      <div className="pv-panel w-[17.5rem] rounded-xl p-4" style={{ borderColor: `${meta.color}40` }}>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
          <span className="font-display text-[15px] font-bold tracking-[0.2em]" style={{ color: meta.color }}>{meta.name}</span>
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.24em] text-[#5a6d94]">{meta.tag}</div>
        <p className="mt-2 text-[11px] leading-relaxed text-[#aebfe0]">{meta.desc}</p>
        <button
          onClick={() => { sfx.enter(); enterWorld(meta.id); }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border py-2 font-mono text-[10px] uppercase tracking-[0.24em] transition-all hover:brightness-125"
          style={{ borderColor: `${meta.color}66`, color: meta.color, background: `${meta.color}12` }}
        >
          Enter world <ChevronRight size={12} />
        </button>
      </div>
    </motion.div>
  );
}

function WorldStage() {
  const world = useStore((s) => s.world) as WorldId;
  switch (world) {
    case "mechanics": return <MechanicsWorld />;
    case "electricity": return <ElectricityWorld />;
    case "waves": return <WavesWorld />;
    case "optics": return <OpticsWorld />;
    case "space": return <SpaceWorld />;
    case "quantum": return <QuantumWorld />;
    case "gravity": return <GravityWorld />;
    case "thermo": return <ThermoWorld />;
    case "fluids": return <FluidsWorld />;
    case "modern": return <ModernWorld />;
    default: return null;
  }
}

export default function App() {
  const phase = useStore((s) => s.phase);
  const sound = useStore((s) => s.sound);
  useDemo();

  useEffect(() => {
    initVoice();
  }, []);

  useEffect(() => {
    setSfxEnabled(sound);
    setVoiceEnabled(sound);
  }, [sound]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const st = useStore.getState();
      if (st.demo) { st.stopDemo(); return; }
      if (st.eq) { st.closeEq(); return; }
      useStore.setState({ phyxOpen: false, missionsOpen: false, progressOpen: false, menuOpen: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#04060d] font-body text-[#e9f1ff]">
      <PhysicsCanvas />
      <div className="vignette pointer-events-none absolute inset-0 z-10" />
      <div className="scanlines pointer-events-none absolute inset-0 z-10 opacity-70" />
      <HUD />
      <AnimatePresence>{phase === "landing" && <Landing key="landing" />}</AnimatePresence>
      <AnimatePresence>{phase === "universe" && <HoverCard key="hover" />}</AnimatePresence>
      {phase === "world" && (
        <Suspense
          fallback={
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <Loader />
            </div>
          }
        >
          <WorldStage key={useStore.getState().world} />
        </Suspense>
      )}
      <EquationPanel />
      <PhyX />
      <Missions />
      <ProgressPanel />
      {/* screen-reader summary of the experience */}
      <div className="sr-only">
        PHYSICSVERSE: an interactive 3D physics education app with ten worlds — mechanics, electricity, waves, optics, space, quantum, gravity, thermodynamics, fluids and modern physics — containing thirty-one simulations computed from standard physics equations.
        <Compass size={1} />
      </div>
    </div>
  );
}
