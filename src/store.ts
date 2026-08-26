import { create } from "zustand";
import { speak, cancelVoice } from "./voice";

export type Phase = "landing" | "universe" | "world";
export type WorldId = "mechanics" | "electricity" | "waves" | "optics" | "space" | "quantum" | "gravity" | "thermo" | "fluids" | "modern";
export type V3 = [number, number, number];

export interface WorldMeta {
  id: WorldId;
  name: string;
  tag: string;
  desc: string;
  color: string;
  pos: V3;
  cam: { pos: V3; look: V3 };
  experiments: { id: string; name: string }[];
}

const R = 16;
const node = (i: number, y: number): V3 => {
  const a = (i / 10) * Math.PI * 2 + Math.PI / 6;
  return [Math.cos(a) * R, y, Math.sin(a) * R];
};

export const LANDING_CAM = { pos: [0, 2.5, 44] as V3, look: [0, 1, 0] as V3 };
export const UNIVERSE_CAM = { pos: [0, 8.5, 27.5] as V3, look: [0, 0, 0] as V3 };
const LAB_CAM = { pos: [0, 3.1, 12.5] as V3, look: [0, 1.4, 0] as V3 };
const FLAT_CAM = { pos: [0, 0.8, 16] as V3, look: [0, 0, 0] as V3 };

export const WORLDS: WorldMeta[] = [
  {
    id: "mechanics", name: "MECHANICS", tag: "Motion • Force • Energy", color: "#ffb454",
    desc: "Projectiles, pendulums and collisions — Newton's playground rendered live in 3D.",
    pos: node(0, 1.4), cam: LAB_CAM,
    experiments: [
      { id: "projectile", name: "Projectile Motion" },
      { id: "pendulum", name: "Pendulum Lab" },
      { id: "collision", name: "Collision Lab" },
    ],
  },
  {
    id: "electricity", name: "ELECTRICITY", tag: "Charges • Circuits • Fields", color: "#53e8ff",
    desc: "Drag charges through a live field, drive a circuit, and bend space with current.",
    pos: node(1, -1.0), cam: FLAT_CAM,
    experiments: [
      { id: "field", name: "Electric Field" },
      { id: "ohm", name: "Ohm's Law Lab" },
      { id: "magnet", name: "Magnetic Field" },
    ],
  },
  {
    id: "waves", name: "WAVES", tag: "Oscillation • Interference", color: "#39f0c3",
    desc: "Ride waveforms, collide two sources, and chase a moving siren with Doppler.",
    pos: node(2, 1.9), cam: FLAT_CAM,
    experiments: [
      { id: "wave", name: "Wave Tank" },
      { id: "interference", name: "Interference" },
      { id: "doppler", name: "Doppler Effect" },
    ],
  },
  {
    id: "optics", name: "OPTICS", tag: "Light • Reflection • Lenses", color: "#ffe08a",
    desc: "Bounce, bend and focus light — every ray obeys Snell's law and the lens equation.",
    pos: node(3, -1.5), cam: FLAT_CAM,
    experiments: [
      { id: "reflection", name: "Reflection" },
      { id: "refraction", name: "Refraction" },
      { id: "lens", name: "Lens Lab" },
    ],
  },
  {
    id: "space", name: "SPACE", tag: "Gravity • Orbits • Cosmos", color: "#7ab8ff",
    desc: "Feel gravity's pull, place a satellite, escape a planet — and meet a black hole.",
    pos: node(4, 0.7), cam: LAB_CAM,
    experiments: [
      { id: "gravity", name: "Gravity Lab" },
      { id: "satellite", name: "Satellite Orbit" },
      { id: "escape", name: "Escape Velocity" },
      { id: "blackhole", name: "Black Hole" },
      { id: "binary", name: "Binary Stars" },
    ],
  },
  {
    id: "quantum", name: "QUANTUM", tag: "Probability • Tunneling", color: "#cf8bff",
    desc: "Where particles become waves: the double-slit mystery and barrier tunneling.",
    pos: node(5, -0.6), cam: FLAT_CAM,
    experiments: [
      { id: "doubleslit", name: "Double-Slit" },
      { id: "tunneling", name: "Tunneling" },
    ],
  },
  {
    id: "gravity", name: "GRAVITY", tag: "Weight • Fall • Attraction", color: "#ff8a5c",
    desc: "Stand on other worlds, drop through atmospheres, and weigh the invisible pull between masses.",
    pos: node(6, 2.0), cam: FLAT_CAM,
    experiments: [
      { id: "weight", name: "Weight on Worlds" },
      { id: "freefall", name: "Free Fall" },
      { id: "cavendish", name: "Cavendish Balance" },
    ],
  },
  {
    id: "thermo", name: "THERMO", tag: "Heat • Gas • Engines", color: "#ff7b6b",
    desc: "Squeeze a live gas, run the perfect engine, and watch heat bleed away to the room.",
    pos: node(7, -1.6), cam: FLAT_CAM,
    experiments: [
      { id: "gas", name: "Ideal Gas Law" },
      { id: "carnot", name: "Carnot Engine" },
      { id: "cooling", name: "Newton's Cooling" },
    ],
  },
  {
    id: "fluids", name: "FLUIDS", tag: "Buoyancy • Flow • Pressure", color: "#4dd0ff",
    desc: "Float or sink, accelerate through a venturi, and lift a car with Pascal's principle.",
    pos: node(8, 0.9), cam: FLAT_CAM,
    experiments: [
      { id: "buoyancy", name: "Buoyancy Lab" },
      { id: "venturi", name: "Venturi Flow" },
      { id: "hydraulic", name: "Hydraulic Press" },
    ],
  },
  {
    id: "modern", name: "MODERN", tag: "Relativity • Photons • Nuclei", color: "#ff5ca8",
    desc: "Slow down time, knock electrons loose with light, and unlock the energy inside mass.",
    pos: node(9, -2.2), cam: FLAT_CAM,
    experiments: [
      { id: "dilation", name: "Time Dilation" },
      { id: "photoelectric", name: "Photoelectric Effect" },
      { id: "fission", name: "E = mc² Fission" },
    ],
  },
];

export const DEFAULTS: Record<WorldId, Record<string, number | boolean>> = {
  mechanics: { pj_v0: 22, pj_ang: 55, pj_g: 9.81, pj_h0: 1.5, pj_drag: false, pj_run: 1, pn_L: 2.5, pn_m: 1.5, pn_g: 9.81, pn_th: 45, pn_run: 1, cl_mA: 2, cl_mB: 3, cl_vA: 4, cl_vB: -2, cl_el: true, cl_run: 1 },
  electricity: { ef_q: 3, ohm_V: 9, ohm_R: 15, mag_I: 5, mag_r: 4 },
  waves: { wv_A: 0.5, wv_f: 1.4, wv_l: 2.2, wv_ph: 0, if_d: 2.4, if_f: 1.4, if_ph: 0, dp_vs: 60, dp_vo: 0, dp_f: 800 },
  optics: { rf_th: 40, rr_n1: 1.0, rr_n2: 1.5, rr_th: 45, ln_convex: true, ln_f: 12, ln_u: 30 },
  space: { gr_m: 2, gr_d: 10, st_alt: 400, st_v: 7.67, st_run: 1, es_v: 11.2, es_run: 1, bh_m: 10, bn_m1: 4, bn_m2: 1, bn_a: 6 },
  quantum: { ds_l: 550, ds_d: 2.5, ds_wave: false, ds_run: 1, tn_E: 0.6, tn_V0: 1.2, tn_a: 1.0 },
  gravity: { wt_m: 10, wt_p: 2, ff_h: 120, ff_g: 9.81, ff_vt: 42, ff_run: 1, cv_m1: 800, cv_m2: 800, cv_r: 0.5 },
  thermo: { gas_T: 300, gas_V: 12, gas_n: 1, cn_Th: 600, cn_Tc: 300, cl_T0: 90, cl_Tenv: 22, cl_k: 0.06 },
  fluids: { bu_rho: 650, bu_fluid: 1000, vn_v1: 4, vn_ratio: 2.2, hy_F: 120, hy_ratio: 30 },
  modern: { td_v: 0.6, pe_f: 700, pe_I: 60, pe_metal: 0, fs_g: 1, fs_run: 1 },
};

export interface EqPayload {
  title: string;
  formula: string;
  vars: [string, string][];
  steps: string[];
  result: string;
  note?: string;
}

export interface ProgressSlice {
  xp: number;
  visited: WorldId[];
  missionsDone: string[];
}

export const ACHIEVEMENTS: { id: string; name: string; desc: string; check: (p: ProgressSlice) => boolean }[] = [
  { id: "explorer", name: "Physics Explorer", desc: "Visit all six worlds", check: (p) => p.visited.length >= 6 },
  { id: "newton", name: "Newton Master", desc: "Complete the Moon Jump mission", check: (p) => p.missionsDone.includes("m2") },
  { id: "wave", name: "Wave Rider", desc: "Complete the interference mission", check: (p) => p.missionsDone.includes("m5") },
  { id: "electric", name: "Electric Mind", desc: "Complete the field target mission", check: (p) => p.missionsDone.includes("m3") },
  { id: "optics", name: "Optics Expert", desc: "Complete the refraction mission", check: (p) => p.missionsDone.includes("m4") },
  { id: "space", name: "Space Navigator", desc: "Achieve a stable orbit mission", check: (p) => p.missionsDone.includes("m1") },
  { id: "quantum", name: "Quantum Explorer", desc: "Enter the quantum world", check: (p) => p.visited.includes("quantum") },
  { id: "gravity", name: "Gravity Geek", desc: "Explore the gravity world", check: (p) => p.visited.includes("gravity") },
  { id: "heat", name: "Heat Engineer", desc: "Complete the Carnot mission", check: (p) => p.missionsDone.includes("m7") },
];

export const levelFor = (xp: number) => Math.floor(xp / 400) + 1;

function loadSave(): ProgressSlice {
  try {
    const raw = localStorage.getItem("physicsverse-save-v1");
    if (raw) {
      const d = JSON.parse(raw);
      return {
        xp: Number.isFinite(d.xp) ? d.xp : 0,
        visited: Array.isArray(d.visited) ? d.visited : [],
        missionsDone: Array.isArray(d.missionsDone) ? d.missionsDone : [],
      };
    }
  } catch { /* ignore corrupt saves */ }
  return { xp: 0, visited: [], missionsDone: [] };
}

function persist(s: ProgressSlice) {
  try { localStorage.setItem("physicsverse-save-v1", JSON.stringify(s)); } catch { /* storage full/blocked */ }
}

export const IS_COARSE = typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches || window.innerWidth < 820);
export const REDUCED_MOTION = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface PVState extends ProgressSlice {
  phase: Phase;
  world: WorldId;
  exp: string;
  hover: WorldId | null;
  cam: { pos: V3; look: V3; id: number };
  paused: boolean;
  sound: boolean;
  quality: "high" | "low";
  sim: Record<string, number | boolean>;
  eq: EqPayload | null;
  phyxOpen: boolean;
  missionsOpen: boolean;
  progressOpen: boolean;
  menuOpen: boolean;
  demo: boolean;
  demoCaption: string;
  begin: () => void;
  enterWorld: (w: WorldId) => void;
  leaveWorld: () => void;
  setExp: (e: string) => void;
  setHover: (w: WorldId | null) => void;
  fly: (pos: V3, look: V3) => void;
  setSim: (k: string, v: number | boolean) => void;
  sims: (o: Record<string, number | boolean>) => void;
  bump: (k: string) => void;
  resetWorld: () => void;
  setPaused: (b: boolean) => void;
  toggleSound: () => void;
  openEq: (e: EqPayload) => void;
  closeEq: () => void;
  setPanel: (k: "phyxOpen" | "missionsOpen" | "progressOpen" | "menuOpen", b: boolean) => void;
  addXp: (n: number) => void;
  completeMission: (id: string, xp: number) => void;
  startDemo: () => void;
  stopDemo: () => void;
  setDemoCaption: (s: string) => void;
}

const saved = loadSave();

export const useStore = create<PVState>((set, get) => ({
  phase: "landing",
  world: "mechanics",
  exp: "projectile",
  hover: null,
  cam: { ...LANDING_CAM, id: 0 },
  paused: false,
  sound: true,
  quality: IS_COARSE ? "low" : "high",
  sim: { ...DEFAULTS.mechanics },
  eq: null,
  phyxOpen: false,
  missionsOpen: false,
  progressOpen: false,
  menuOpen: false,
  demo: false,
  demoCaption: "",
  xp: saved.xp,
  visited: saved.visited,
  missionsDone: saved.missionsDone,

  begin: () => {
    set((s) => ({ phase: "universe", cam: { ...UNIVERSE_CAM, id: s.cam.id + 1 } }));
    speak("Welcome to the world of physics. Explore. Experiment. Understand.");
  },

  enterWorld: (w) => {
    const meta = WORLDS.find((x) => x.id === w);
    if (!meta) return;
    const s = get();
    const first = !s.visited.includes(w);
    const visited = first ? [...s.visited, w] : s.visited;
    const xp = s.xp + (first ? 25 : 0);
    set({
      phase: "world", world: w, exp: meta.experiments[0].id, hover: null,
      cam: { ...meta.cam, id: s.cam.id + 1 }, visited, xp,
      sim: { ...DEFAULTS[w] }, paused: false, eq: null,
    });
    persist({ xp, visited, missionsDone: s.missionsDone });
    speak(`Entering ${meta.name.toLowerCase()}. ${meta.tag.replace(/•/g, ",")}.`);
  },

  leaveWorld: () => {
    set((s) => ({ phase: "universe", cam: { ...UNIVERSE_CAM, id: s.cam.id + 1 }, eq: null, hover: null }));
    speak("Returning to the universe.");
  },

  setExp: (e) => set((s) => ({ exp: e, sim: { ...DEFAULTS[s.world] }, eq: null })),

  setHover: (w) => set({ hover: w }),

  fly: (pos, look) => set((s) => ({ cam: { pos, look, id: s.cam.id + 1 } })),

  setSim: (k, v) => set((s) => ({ sim: { ...s.sim, [k]: v } })),
  sims: (o) => set((s) => ({ sim: { ...s.sim, ...o } })),
  bump: (k) => set((s) => ({ sim: { ...s.sim, [k]: (Number(s.sim[k]) || 0) + 1 } })),
  resetWorld: () => set((s) => ({ sim: { ...DEFAULTS[s.world] }, paused: false })),

  setPaused: (b) => set({ paused: b }),
  toggleSound: () => set((s) => ({ sound: !s.sound })),

  openEq: (e) => set({ eq: e }),
  closeEq: () => set({ eq: null }),

  setPanel: (k, b) => set({ [k]: b } as Partial<PVState>),

  addXp: (n) => {
    const s = get();
    const xp = s.xp + n;
    set({ xp });
    persist({ xp, visited: s.visited, missionsDone: s.missionsDone });
  },

  completeMission: (id, xpGain) => {
    const s = get();
    if (s.missionsDone.includes(id)) return;
    const missionsDone = [...s.missionsDone, id];
    const xp = s.xp + xpGain;
    set({ missionsDone, xp });
    persist({ xp, visited: s.visited, missionsDone });
  },

  startDemo: () => set({ demo: true, demoCaption: "", menuOpen: false }),
  stopDemo: () => set((s) => ({ demo: false, demoCaption: "", cam: { ...UNIVERSE_CAM, id: s.cam.id + 1 }, phase: s.phase === "landing" ? "universe" : s.phase })),
  setDemoCaption: (demoCaption) => set({ demoCaption }),
}));
