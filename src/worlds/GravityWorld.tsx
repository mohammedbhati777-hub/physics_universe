import { useEffect, useRef } from "react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { PLANETS, freeFall, cavendishF, fmt, clamp } from "../physics";

const META = WORLDS.find((w) => w.id === "gravity")!;

/* ================= Weight on worlds ================= */
function WeightCanvas() {
  const ref = useCanvasLoop((ctx, w, h) => {
    const m = Number(useStore.getState().sim.wt_m);
    const pi = Number(useStore.getState().sim.wt_p);
    const planet = PLANETS[clamp(Math.round(pi), 0, PLANETS.length - 1)];
    const g = planet.g;
    const W = m * g;
    ctx.clearRect(0, 0, w, h);

    // planet horizon
    const colors: Record<string, string> = { Moon: "#9aa7bd", Mars: "#c96a3c", Earth: "#2f6fbe", Neptune: "#3a66c9", Jupiter: "#c9a06a", Sun: "#e8b83a" };
    const pc = colors[planet.name] || "#445";
    const R = w * 1.6;
    ctx.save();
    ctx.fillStyle = pc;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(w / 2, h + R - h * 0.16, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = `${pc}`;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(w / 2, h + R - h * 0.16, R, Math.PI * 1.28, Math.PI * 1.72);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // ceiling + spring scale
    const cx = w / 2;
    ctx.fillStyle = "#1a2440";
    ctx.fillRect(cx - 70, 22, 140, 10);
    ctx.fillStyle = "#3a4a70";
    ctx.fillRect(cx - 3, 32, 6, 12);

    const Wmax = 120 * 274;
    const ext = clamp(W / Wmax, 0.04, 1);
    const springTop = 44;
    const panY = springTop + 60 + ext * (h * 0.3);
    // spring zigzag
    ctx.strokeStyle = "#8fa3c8";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx, springTop);
    const coils = 9;
    for (let i = 1; i <= coils; i++) {
      const y = springTop + ((panY - 14 - springTop) * i) / coils;
      ctx.lineTo(cx + (i % 2 ? 17 : -17), y);
    }
    ctx.lineTo(cx, panY - 10);
    ctx.stroke();
    // pan
    ctx.fillStyle = "#2a3d66";
    ctx.strokeStyle = "#53e8ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, panY, 46, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // block (size ∝ mass)
    const bs = 26 + Math.cbrt(m) * 9;
    ctx.save();
    ctx.shadowColor = "rgba(255,138,92,0.6)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#ff8a5c";
    ctx.fillRect(cx - bs / 2, panY - 9 - bs, bs, bs);
    ctx.restore();
    ctx.fillStyle = "#071018";
    ctx.font = "700 11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${m}kg`, cx, panY - 9 - bs / 2 + 4);

    // readouts
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "700 16px 'IBM Plex Mono', monospace";
    ctx.fillText(`W = ${fmt(W, 1)} N`, cx, panY + 34);
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 11px 'IBM Plex Mono', monospace";
    ctx.fillText(`on ${planet.name}  •  g = ${g} m/s²`, cx, panY + 54);

    // g arrow
    const ax = w - 60;
    const alen = clamp(g * 2.4, 18, 110);
    ctx.strokeStyle = "#ffb454";
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(ax, 60); ctx.lineTo(ax, 60 + alen); ctx.stroke();
    ctx.fillStyle = "#ffb454";
    ctx.beginPath(); ctx.moveTo(ax, 66 + alen); ctx.lineTo(ax - 6, 56 + alen); ctx.lineTo(ax + 6, 56 + alen); ctx.closePath(); ctx.fill();
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.fillText("g", ax, 50);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function WeightUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const m = Number(sim.wt_m);
  const pi = clamp(Math.round(Number(sim.wt_p)), 0, PLANETS.length - 1);
  const g = PLANETS[pi].g;
  const W = m * g;
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><WeightCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Scale Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Weight",
          formula: "W = m·g",
          vars: [["m", `${m} kg (mass — invariant)`], ["g", `${g} m/s² (${PLANETS[pi].name})`]],
          steps: [`W = ${m} × ${g} = ${fmt(W, 2)} N`, `on Earth the same mass weighs ${fmt(m * 9.81, 1)} N`],
          result: `W = ${fmt(W, 1)} N on ${PLANETS[pi].name}`,
          note: "Mass is how much matter you carry; weight is the force gravity exerts on it. The scale reads force.",
        })} />}
      >
        <Slider label="Mass on the pan" unit="kg" min={2} max={120} step={1} value={m} onChange={(x) => setSim("wt_m", x)} />
        <div className="grid grid-cols-3 gap-1">
          {PLANETS.map((p, i) => (
            <button key={p.name} onClick={() => setSim("wt_p", i)}
              className={`rounded border px-1 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${i === pi ? "border-[rgba(255,138,92,0.6)] bg-[rgba(255,138,92,0.1)] text-[#ff8a5c]" : "border-[rgba(96,145,255,0.14)] text-[#5a6d94] hover:text-[#a9bde2]"}`}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Weight W" value={fmt(W, 1)} unit="N" accent="#ff8a5c" />
          <Stat label="Local g" value={fmt(g, 2)} unit="m/s²" />
          <Stat label="Earth equiv." value={fmt(m * 9.81, 1)} unit="N" />
          <Stat label="Mass" value={fmt(m, 0)} unit="kg" accent="#53e8ff" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Free fall ================= */
const FALL_PRESETS: [string, number][] = [["Feather", 8], ["Paper", 15], ["Ball", 42], ["Steel", 120]];

function FreeFallCanvas() {
  const tAcc = useRef(0);
  const lastKey = useRef("");
  const run = useStore((s) => Number(s.sim.ff_run));
  useEffect(() => { tAcc.current = 0; }, [run]);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const h0 = Number(st.sim.ff_h);
    const g = Number(st.sim.ff_g);
    const vt = Number(st.sim.ff_vt);
    const key = `${h0}|${g}|${vt}`;
    if (key !== lastKey.current) { lastKey.current = key; tAcc.current = 0; }
    if (!st.paused) tAcc.current += dt;

    const out = freeFall(h0, g, vt);
    const tNow = Math.min(tAcc.current, out.tImpact);
    const idx = clamp(Math.floor((tNow / Math.max(0.001, out.tImpact)) * (out.pts.length - 1)), 0, out.pts.length - 1);
    const cur = out.pts[idx];
    ctx.clearRect(0, 0, w, h);

    const trackX = w * 0.26;
    const topY = 44;
    const botY = h - 40;
    const scale = (botY - topY) / h0;

    // ruler
    ctx.strokeStyle = "rgba(233,241,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(trackX - 26, topY); ctx.lineTo(trackX - 26, botY); ctx.stroke();
    ctx.fillStyle = "rgba(233,241,255,0.55)";
    ctx.font = "500 9px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    const stepM = h0 <= 150 ? 20 : 50;
    for (let hh = 0; hh <= h0; hh += stepM) {
      const y = botY - hh * scale;
      ctx.beginPath(); ctx.moveTo(trackX - 34, y); ctx.lineTo(trackX - 26, y); ctx.stroke();
      ctx.fillText(`${hh}`, trackX - 38, y + 3);
    }
    // ground
    ctx.fillStyle = "rgba(255,138,92,0.25)";
    ctx.fillRect(trackX - 60, botY, 120, 8);

    // falling body
    const yNow = botY - cur.h * scale;
    ctx.save();
    ctx.shadowColor = "rgba(255,138,92,0.8)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff8a5c";
    ctx.beginPath(); ctx.arc(trackX, yNow, 10, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // velocity vector
    const vlen = clamp(cur.v * 1.3, 0, 110);
    if (vlen > 4) {
      ctx.strokeStyle = "#53e8ff";
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(trackX + 20, yNow); ctx.lineTo(trackX + 20, yNow + vlen); ctx.stroke();
      ctx.fillStyle = "#53e8ff";
      ctx.beginPath(); ctx.moveTo(trackX + 20, yNow + vlen + 6); ctx.lineTo(trackX + 14, yNow + vlen - 4); ctx.lineTo(trackX + 26, yNow + vlen - 4); ctx.closePath(); ctx.fill();
    }

    // readout
    ctx.textAlign = "left";
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "600 13px 'IBM Plex Mono', monospace";
    ctx.fillText(`t = ${fmt(tNow, 2)} s`, trackX - 50, 24);
    ctx.fillStyle = "#53e8ff";
    ctx.fillText(`v = ${fmt(cur.v, 1)} m/s`, trackX + 40, 24);
    if (tNow >= out.tImpact - 0.001) {
      ctx.fillStyle = "#39f0c3";
      ctx.font = "700 12px 'IBM Plex Mono', monospace";
      ctx.fillText(`impact at ${fmt(out.tImpact, 2)} s  •  ${fmt(cur.v, 1)} m/s`, trackX - 50, botY + 26);
    }

    // v(t) graph panel
    const gx = w * 0.52; const gy = 30; const gw = w * 0.44; const gh = h - 90;
    ctx.strokeStyle = "rgba(96,145,255,0.25)";
    ctx.strokeRect(gx, gy, gw, gh);
    ctx.fillStyle = "rgba(233,241,255,0.5)";
    ctx.font = "500 9px 'IBM Plex Mono', monospace";
    ctx.fillText("v(t) — with air drag", gx + 8, gy + 14);
    // asymptote
    const vymax = Math.max(out.vt * 1.15, 10);
    const yOf = (v: number) => gy + gh - 14 - (v / vymax) * (gh - 34);
    const xOf = (t: number) => gx + 10 + (t / Math.max(0.01, out.tImpact)) * (gw - 22);
    ctx.strokeStyle = "rgba(255,180,84,0.5)";
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.moveTo(gx + 6, yOf(out.vt)); ctx.lineTo(gx + gw - 6, yOf(out.vt)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffb454";
    ctx.fillText(`v_terminal = ${fmt(out.vt, 0)} m/s`, gx + gw - 130, yOf(out.vt) - 5);
    // curve
    ctx.strokeStyle = "#53e8ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    out.pts.forEach((p, i) => {
      const px = xOf(p.t); const py = yOf(p.v);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();
    // marker
    ctx.fillStyle = "#ff8a5c";
    ctx.beginPath(); ctx.arc(xOf(tNow), yOf(cur.v), 4.5, 0, Math.PI * 2); ctx.fill();
    // vacuum comparison
    ctx.strokeStyle = "rgba(233,241,255,0.35)";
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const tt = (i / 40) * out.tImpact;
      const vv = g * tt;
      if (vv > vymax) break;
      const px = xOf(tt); const py = yOf(vv);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(233,241,255,0.45)";
    ctx.fillText("dashed: vacuum v = gt", gx + 8, gy + gh - 8);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function FreeFallUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const bump = useStore((s) => s.bump);
  const resetWorld = useStore((s) => s.resetWorld);
  const openEq = useStore((s) => s.openEq);
  const h0 = Number(sim.ff_h); const g = Number(sim.ff_g); const vt = Number(sim.ff_vt);
  const out = freeFall(h0, g, vt);
  const tVac = Math.sqrt((2 * h0) / g);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><FreeFallCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Drop Controls" color={META.color}
        footer={
          <>
            <button onClick={() => { bump("ff_run"); }} className="pv-btn-primary flex-1 !py-2 !text-[10px]">Drop again</button>
            <button onClick={() => resetWorld()} className="pv-btn-ghost !px-3 !py-2 !text-[10px]">Reset</button>
          </>
        }
      >
        <Slider label="Drop height" unit="m" min={20} max={400} step={10} value={h0} onChange={(x) => setSim("ff_h", x)} />
        <Slider label="Gravity" unit="m/s²" min={1.62} max={24.8} step={0.01} value={g} onChange={(x) => setSim("ff_g", x)} />
        <Slider label="Terminal velocity (body)" unit="m/s" min={4} max={150} step={1} value={vt} onChange={(x) => setSim("ff_vt", x)} />
        <div className="flex gap-1">
          {FALL_PRESETS.map(([n, v]) => (
            <button key={n} onClick={() => setSim("ff_vt", v)}
              className={`flex-1 rounded border px-1 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${Math.abs(vt - v) < 0.5 ? "border-[rgba(255,138,92,0.6)] text-[#ff8a5c]" : "border-[rgba(96,145,255,0.14)] text-[#5a6d94] hover:text-[#a9bde2]"}`}>
              {n}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Impact time" value={fmt(out.tImpact, 2)} unit="s" accent="#ff8a5c" />
          <Stat label="Vacuum time" value={fmt(tVac, 2)} unit="s" />
          <Stat label="Impact v" value={fmt(Math.min(vt, g * out.tImpact), 1)} unit="m/s" />
          <Stat label="v terminal" value={fmt(vt, 0)} unit="m/s" accent="#ffb454" />
        </div>
        <EqButton onClick={() => openEq({
          title: "Free Fall with Linear Drag",
          formula: "v(t) = vₜ(1 − e^(−gt/vₜ))",
          vars: [["h₀", `${h0} m`], ["g", `${g} m/s²`], ["vₜ", `${vt} m/s`]],
          steps: [
            `no drag: t = √(2h₀/g) = √(${fmt(2 * h0, 0)}/${g}) = ${fmt(tVac, 2)} s`,
            `with drag: velocity saturates at vₜ when drag = weight`,
            `h(t) = h₀ − vₜt + (vₜ²/g)(1 − e^(−gt/vₜ))`,
            `numerical impact: t = ${fmt(out.tImpact, 2)} s`,
          ],
          result: `t_impact = ${fmt(out.tImpact, 2)} s  (vacuum: ${fmt(tVac, 2)} s)`,
          note: "Linear-drag model — exact closed form shown; the feather never reaches vacuum speed.",
        })} />
      </ControlPanel>
    </>
  );
}

/* ================= Cavendish balance ================= */
function CavendishCanvas() {
  const ref = useCanvasLoop((ctx, w, h) => {
    const m1 = Number(useStore.getState().sim.cv_m1);
    const m2 = Number(useStore.getState().sim.cv_m2);
    const r = Number(useStore.getState().sim.cv_r);
    const F = cavendishF(m1, m2, r);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2; const cy = h / 2;

    // torsion wire + angle scale
    ctx.strokeStyle = "rgba(233,241,255,0.3)";
    ctx.beginPath(); ctx.arc(cx, cy, 62, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58);
      ctx.lineTo(cx + Math.cos(a) * 62, cy + Math.sin(a) * 62);
      ctx.stroke();
    }
    ctx.strokeStyle = "#8fa3c8";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy + 12); ctx.stroke();

    // twist ∝ F (visual scale)
    const Fmax = cavendishF(2000, 2000, 0.2);
    const twist = clamp(F / Fmax, 0, 1) * 0.9;
    const barLen = Math.min(w, h) * 0.2;

    // bar with small masses m2
    const drawMass = (x: number, y: number, mass: number, color: string, big: boolean) => {
      const rr = big ? 16 + Math.cbrt(mass) * 0.9 : 8 + Math.cbrt(mass) * 0.7;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    const bx1 = cx + Math.cos(twist) * barLen;
    const by1 = cy + Math.sin(twist) * barLen;
    const bx2 = cx - Math.cos(twist) * barLen;
    const by2 = cy - Math.sin(twist) * barLen;
    ctx.strokeStyle = "#c8d6f0";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx1, by1); ctx.stroke();
    drawMass(bx1, by1, m2, "#4dd0ff", false);
    drawMass(bx2, by2, m2, "#4dd0ff", false);

    // big masses m1
    const d = r * 110;
    drawMass(cx + Math.cos(twist + Math.PI / 2) * (barLen + d), cy + Math.sin(twist + Math.PI / 2) * (barLen + d) * 0.4 + barLen * 0.35, m1, "#ff8a5c", true);
    drawMass(cx + Math.cos(twist - Math.PI / 2) * (barLen + d), cy + Math.sin(twist - Math.PI / 2) * (barLen + d) * 0.4 - barLen * 0.35, m1, "#ff8a5c", true);

    // attraction arrows
    const arrowF = clamp(F / Fmax, 0.05, 1) * 40 + 14;
    ctx.strokeStyle = "#39f0c3";
    ctx.lineWidth = 2;
    const arw = (x1: number, y1: number, x2: number, y2: number) => {
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + Math.cos(a) * arrowF, y1 + Math.sin(a) * arrowF); ctx.stroke();
      ctx.fillStyle = "#39f0c3";
      ctx.beginPath();
      ctx.moveTo(x1 + Math.cos(a) * (arrowF + 6), y1 + Math.sin(a) * (arrowF + 6));
      ctx.lineTo(x1 + Math.cos(a + 2.6) * 8, y1 + Math.sin(a + 2.6) * 8);
      ctx.lineTo(x1 + Math.cos(a - 2.6) * 8, y1 + Math.sin(a - 2.6) * 8);
      ctx.closePath(); ctx.fill();
    };
    arw(bx1, by1, cx + (barLen + d), cy + barLen * 0.35);
    arw(bx2, by2, cx - (barLen + d), cy - barLen * 0.35);

    ctx.textAlign = "center";
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "700 15px 'IBM Plex Mono', monospace";
    ctx.fillText(`F = ${fmt(F * 1e6, 2)} µN`, cx, 26);
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText(`= ${F.toExponential(2)} N — the force that Cavendish weighed Earth with`, cx, 44);
    ctx.fillText("top view: torsion bar twists until the wire's restoring torque balances F", cx, h - 14);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function CavendishUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const m1 = Number(sim.cv_m1); const m2 = Number(sim.cv_m2); const r = Number(sim.cv_r);
  const F = cavendishF(m1, m2, r);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><CavendishCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Balance Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Newton's Law of Gravitation",
          formula: "F = G·m₁m₂ / r²",
          vars: [["G", "6.674 × 10⁻¹¹ N·m²/kg²"], ["m₁", `${m1} kg`], ["m₂", `${m2} kg`], ["r", `${r} m`]],
          steps: [
            `F = 6.674×10⁻¹¹ × ${m1} × ${m2} / ${r}²`,
            `F = ${F.toExponential(3)} N`,
            `F = ${fmt(F * 1e6, 2)} µN — measurable with a torsion fiber`,
          ],
          result: `F = ${F.toExponential(3)} N`,
          note: "In 1798 Cavendish measured this tiny force and thereby 'weighed the Earth' — G pins down planetary masses.",
        })} />}
      >
        <Slider label="Large mass m₁" unit="kg" min={100} max={2000} step={25} value={m1} onChange={(x) => setSim("cv_m1", x)} />
        <Slider label="Small mass m₂" unit="kg" min={50} max={1000} step={10} value={m2} onChange={(x) => setSim("cv_m2", x)} />
        <Slider label="Separation r" unit="m" min={0.2} max={1.2} step={0.05} value={r} onChange={(x) => setSim("cv_r", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Force F" value={fmt(F * 1e6, 2)} unit="µN" accent="#39f0c3" />
          <Stat label="In newtons" value={F.toExponential(1)} unit="N" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Halve the distance → force ×4. Double a mass → force ×2. The inverse square is right there.</p>
      </ControlPanel>
    </>
  );
}

export default function GravityWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "weight" && <WeightUI />}
      {exp === "freefall" && <FreeFallUI />}
      {exp === "cavendish" && <CavendishUI />}
    </div>
  );
}
