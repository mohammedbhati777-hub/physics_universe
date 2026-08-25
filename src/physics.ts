/* PHYSICSVERSE core — every number in the UI is computed here, in SI units.
   Pure functions only: Simulation State → Renderer / Graphs / Equation Panel. */

export const G = 6.6743e-11;           // N·m²/kg²
export const M_EARTH = 5.972e24;       // kg
export const R_EARTH = 6.371e6;        // m
export const K_E = 8.9875e9;           // N·m²/C²
export const MU0 = 1.25663706212e-6;   // T·m/A
export const C_LIGHT = 2.99792458e8;   // m/s
export const HBAR = 1.0545718e-34;     // J·s
export const M_ELECTRON = 9.10938e-31; // kg
export const EV_J = 1.602176634e-19;   // J per eV
export const V_SOUND = 343;            // m/s in air

export const clamp = (x: number, a: number, b: number) =>
  Math.min(b, Math.max(a, Number.isFinite(x) ? x : a));

export function fmt(x: number, d = 2): string {
  if (!Number.isFinite(x)) return "—";
  const ax = Math.abs(x);
  if (x !== 0 && (ax >= 1e6 || ax < 1e-3)) return x.toExponential(d);
  return x.toFixed(d);
}

/* ---------------- Projectile motion ---------------- */
export interface TrajPoint { t: number; x: number; y: number; vx: number; vy: number }
export interface ProjectileOut { pts: TrajPoint[]; range: number; maxH: number; tof: number; vFinal: number }

export function projectile(v0: number, angleDeg: number, g: number, h0: number, drag: boolean, k = 0.028): ProjectileOut {
  v0 = clamp(v0, 1, 120); g = clamp(g, 0.4, 30); h0 = clamp(h0, 0, 60);
  angleDeg = clamp(angleDeg, 1, 89);
  const a = (angleDeg * Math.PI) / 180;
  let vx = v0 * Math.cos(a);
  let vy = v0 * Math.sin(a);
  let x = 0; let y = h0; let t = 0;
  const dt = 1 / 240;
  const pts: TrajPoint[] = [{ t, x, y, vx, vy }];
  let maxH = y;
  const maxSteps = 240 * 90;
  for (let i = 0; i < maxSteps; i++) {
    const sp = Math.hypot(vx, vy);
    const ax = drag ? -k * sp * vx : 0;
    const ay = -g + (drag ? -k * sp * vy : 0);
    const ny = y + vy * dt + 0.5 * ay * dt * dt;
    vx += ax * dt; vy += ay * dt;
    x += vx * dt; t += dt;
    if (ny <= 0 && y > 0) {
      const f = y / (y - ny);
      x = x - vx * dt + vx * dt * f;
      y = 0; t = t - dt + dt * f;
      pts.push({ t, x, y: 0, vx, vy });
      break;
    }
    y = Math.max(0, ny);
    if (y > maxH) maxH = y;
    if (i % 3 === 0) pts.push({ t, x, y, vx, vy });
    if (y <= 0) break;
  }
  const last = pts[pts.length - 1];
  return { pts, range: last.x, maxH, tof: last.t, vFinal: Math.hypot(last.vx, last.vy) };
}

/* ---------------- Pendulum ---------------- */
export function pendulumPeriod(L: number, g: number, th0Rad: number): number {
  L = clamp(L, 0.2, 12); g = clamp(g, 0.4, 30);
  const T0 = 2 * Math.PI * Math.sqrt(L / g);
  const t2 = th0Rad * th0Rad;
  return T0 * (1 + t2 / 16 + (11 * t2 * t2) / 3072); // large-angle correction
}
export function pendulumStep(th: number, om: number, L: number, g: number, dt: number) {
  const al = -(g / Math.max(0.05, L)) * Math.sin(th);
  const om2 = om + al * dt;
  return { th: th + om2 * dt, om: om2, al };
}

/* ---------------- 1-D collisions ---------------- */
export interface CollisionOut { v1p: number; v2p: number; pBefore: number; pAfter: number; keBefore: number; keAfter: number }
export function collide1D(m1: number, m2: number, v1: number, v2: number, elastic: boolean): CollisionOut {
  m1 = clamp(m1, 0.05, 50); m2 = clamp(m2, 0.05, 50);
  const pBefore = m1 * v1 + m2 * v2;
  const keBefore = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
  let v1p: number; let v2p: number;
  if (elastic) {
    v1p = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
    v2p = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
  } else {
    v1p = v2p = pBefore / (m1 + m2);
  }
  return { v1p, v2p, pBefore, pAfter: m1 * v1p + m2 * v2p, keBefore, keAfter: 0.5 * m1 * v1p * v1p + 0.5 * m2 * v2p * v2p };
}

/* ---------------- Electrostatics ---------------- */
export interface Charge { x: number; y: number; q: number }
export function eFieldAt(charges: Charge[], px: number, py: number) {
  let Ex = 0; let Ey = 0;
  for (const c of charges) {
    const dx = px - c.x; const dy = py - c.y;
    const r2 = dx * dx + dy * dy + 1e-9;
    const r = Math.sqrt(r2);
    const E = (K_E * c.q) / r2;
    Ex += (E * dx) / r; Ey += (E * dy) / r;
  }
  return { Ex, Ey, mag: Math.hypot(Ex, Ey) };
}

export function traceFieldLines(charges: Charge[], w: number, h: number): number[][] {
  const lines: number[][] = [];
  const step = 4; const maxSteps = 240;
  for (const c of charges) {
    if (c.q <= 0) continue;
    const seeds = 10;
    for (let i = 0; i < seeds; i++) {
      const a0 = (i / seeds) * Math.PI * 2;
      let x = c.x + Math.cos(a0) * 10;
      let y = c.y + Math.sin(a0) * 10;
      const pts: number[] = [x, y];
      for (let s = 0; s < maxSteps; s++) {
        const E = eFieldAt(charges, x, y);
        if (E.mag < 1e-3) break;
        // RK2 midpoint step along normalized E
        const mx = x + (0.5 * step * E.Ex) / E.mag;
        const my = y + (0.5 * step * E.Ey) / E.mag;
        const Em = eFieldAt(charges, mx, my);
        if (Em.mag < 1e-3) break;
        x += (step * Em.Ex) / Em.mag;
        y += (step * Em.Ey) / Em.mag;
        pts.push(x, y);
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) break;
        let hitNeg = false;
        for (const q of charges) if (q.q < 0 && Math.hypot(x - q.x, y - q.y) < 9) { hitNeg = true; break; }
        if (hitNeg) break;
      }
      if (pts.length >= 4) lines.push(pts);
    }
  }
  return lines;
}

/* ---------------- Circuits ---------------- */
export function ohm(V: number, R: number) {
  V = clamp(V, 0, 240); R = clamp(R, 0.1, 1e6);
  const I = V / R;
  return { I, P: V * I, V, R };
}
export function bWire(I: number, rCm: number) {
  const r = clamp(rCm, 0.1, 1000) / 100;
  return (MU0 * I) / (2 * Math.PI * r); // Tesla
}

/* ---------------- Waves ---------------- */
export const waveY = (A: number, f: number, lambda: number, phi: number, x: number, t: number) => {
  const k = (2 * Math.PI) / Math.max(0.01, lambda);
  const w = 2 * Math.PI * f;
  return A * Math.sin(k * x - w * t + phi);
};
export const waveSpeed = (f: number, lambda: number) => f * lambda;

export function dopplerShift(f: number, vsToward: number, voToward: number, v = V_SOUND) {
  f = clamp(f, 20, 20000);
  vsToward = clamp(vsToward, -v + 1, v - 1);
  voToward = clamp(voToward, -v + 1, v - 1);
  const denom = v - vsToward;
  if (denom <= 1) return { fObs: Infinity, factor: Infinity };
  const fObs = f * (v + voToward) / denom;
  return { fObs, factor: fObs / f };
}

/* ---------------- Optics ---------------- */
export function refract(n1: number, n2: number, th1Deg: number) {
  n1 = clamp(n1, 1, 3); n2 = clamp(n2, 1, 3); th1Deg = clamp(th1Deg, 0, 89);
  const th1 = (th1Deg * Math.PI) / 180;
  const s = (n1 / n2) * Math.sin(th1);
  if (Math.abs(s) > 1) return { tir: true as const, th2Deg: NaN, th1Deg, n1, n2 };
  const th2 = Math.asin(s);
  return { tir: false as const, th2Deg: (th2 * 180) / Math.PI, th1Deg, n1, n2 };
}

export interface LensOut { v: number; m: number; real: boolean; inverted: boolean; di: number }
export function thinLens(fCm: number, uCm: number): LensOut {
  const f = clamp(fCm, -100, 100);
  const u = -clamp(uCm, 1, 1000); // object on incoming side ⇒ negative (Cartesian sign convention)
  if (Math.abs(f) < 0.5) return { v: NaN, m: NaN, real: false, inverted: false, di: NaN };
  const v = (f * u) / (u + f); // from 1/v − 1/u = 1/f
  const m = v / u;
  return { v, m, real: v > 0, inverted: m < 0, di: Math.abs(v) };
}

/* ---------------- Gravitation & orbits ---------------- */
export const gravityForce = (m1: number, m2: number, r: number) =>
  (G * m1 * m2) / Math.max(1, r * r);

export function circularOrbit(altKm: number, M = M_EARTH) {
  const r = R_EARTH + clamp(altKm, 1, 400000) * 1000;
  const v = Math.sqrt((G * M) / r);
  return { r, v, T: (2 * Math.PI * r) / v, GM: G * M };
}

export interface OrbitPath { pts: [number, number][]; outcome: "orbit" | "crash" | "escape"; rMin: number; rMax: number }
export function orbitPath(altKm: number, vKmS: number, M = M_EARTH): OrbitPath {
  const GM = G * M;
  const r0 = R_EARTH + clamp(altKm, 1, 400000) * 1000;
  const v0 = clamp(vKmS, 0.5, 60) * 1000;
  let x = r0; let y = 0; let vx = 0; let vy = v0;
  const Tc = 2 * Math.PI * Math.sqrt(r0 * r0 * r0 / GM);
  const dt = Tc / 1400;
  const pts: [number, number][] = [[x, y]];
  let rMin = r0; let rMax = r0;
  let outcome: OrbitPath["outcome"] = "orbit";
  const steps = 4200;
  for (let i = 0; i < steps; i++) {
    let r = Math.hypot(x, y);
    let ax = (-GM * x) / (r * r * r);
    let ay = (-GM * y) / (r * r * r);
    const nx = x + vx * dt + 0.5 * ax * dt * dt;
    const ny = y + vy * dt + 0.5 * ay * dt * dt;
    r = Math.hypot(nx, ny);
    const ax2 = (-GM * nx) / (r * r * r);
    const ay2 = (-GM * ny) / (r * r * r);
    vx += 0.5 * (ax + ax2) * dt;
    vy += 0.5 * (ay + ay2) * dt;
    x = nx; y = ny;
    rMin = Math.min(rMin, r); rMax = Math.max(rMax, r);
    if (i % 4 === 0) pts.push([x, y]);
    if (r <= R_EARTH * 0.999) { outcome = "crash"; pts.push([x, y]); break; }
    if (r > r0 * 8) { outcome = "escape"; break; }
    if (i > 900 && x > 0 && Math.abs(y) < r0 * 0.02 && vy > 0) break; // closed ellipse
  }
  if (rMin <= R_EARTH) outcome = "crash";
  return { pts, outcome, rMin, rMax };
}

export const escapeVelocity = (M = M_EARTH, r = R_EARTH) => Math.sqrt((2 * G * M) / r);

export interface EscapePath { pts: [number, number][]; outcome: "fall" | "escape" | "margin"; ve: number }
export function escapePath(vKmS: number, M = M_EARTH): EscapePath {
  const GM = G * M;
  const ve = escapeVelocity(M);
  let r = R_EARTH * 1.01;
  let v = clamp(vKmS, 0.5, 40) * 1000;
  const dt = 22;
  const pts: [number, number][] = [[0, r]];
  let outcome: EscapePath["outcome"] = v >= ve * 0.995 ? (v <= ve * 1.02 ? "margin" : "escape") : "fall";
  for (let i = 0; i < 2600; i++) {
    const a = -GM / (r * r);
    r += v * dt + 0.5 * a * dt * dt;
    v += a * dt;
    if (i % 6 === 0) pts.push([0, r]);
    if (r <= R_EARTH) { outcome = "fall"; pts.push([0, R_EARTH]); break; }
    if (r > R_EARTH * 14) { if (outcome === "fall") outcome = "fall"; break; }
  }
  return { pts, outcome, ve };
}

/* ---------------- Quantum ---------------- */
export function tunnelProbability(E_eV: number, V0_eV: number, a_nm: number) {
  E_eV = clamp(E_eV, 0.01, 20); V0_eV = clamp(V0_eV, 0.05, 20); a_nm = clamp(a_nm, 0.1, 10);
  if (E_eV >= V0_eV) return { T: 1, above: true as const, kappa: 0 };
  const kappa = Math.sqrt((2 * M_ELECTRON * (V0_eV - E_eV) * EV_J)) / HBAR; // 1/m
  const T = Math.exp(-2 * kappa * a_nm * 1e-9);
  return { T: clamp(T, 0, 1), above: false as const, kappa };
}

export interface SlitPattern { xs: number[]; cdf: number[]; sample: () => number; maxI: number }
export function slitPattern(lambdaNm: number, dUm: number, L = 1.2, N = 480): SlitPattern {
  const lambda = clamp(lambdaNm, 200, 900) * 1e-9;
  const d = clamp(dUm, 0.5, 20) * 1e-6;
  const width = (lambda * L) / d; // central fringe scale
  const span = Math.max(0.002, width * 6);
  const xs: number[] = []; const cdf: number[] = [];
  let acc = 0; let maxI = 0;
  const aSlit = d / 4;
  for (let i = 0; i < N; i++) {
    const x = -span + (2 * span * i) / (N - 1);
    const beta = (Math.PI * d * x) / (lambda * L);
    const alpha = (Math.PI * aSlit * x) / (lambda * L);
    const env = Math.abs(alpha) < 1e-6 ? 1 : Math.sin(alpha) / alpha;
    const I = Math.cos(beta) ** 2 * env * env;
    if (I > maxI) maxI = I;
    acc += I;
    xs.push(x); cdf.push(acc);
  }
  for (let i = 0; i < N; i++) cdf[i] /= acc || 1;
  const sample = () => {
    const u = Math.random();
    let lo = 0; let hi = N - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
    const base = xs[lo];
    return base + (Math.random() - 0.5) * (2 * span) / N * 1.6;
  };
  return { xs, cdf, sample, maxI };
}
