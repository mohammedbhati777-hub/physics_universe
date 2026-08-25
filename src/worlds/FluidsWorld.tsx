import { useRef } from "react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { buoyancy, venturi, hydraulic, fmt, clamp } from "../physics";
import { drawObj, preloadSprites } from "../sprites";

preloadSprites(["ice", "steel", "ball"]);

const META = WORLDS.find((w) => w.id === "fluids")!;
const FLUIDS: [string, number][] = [["Oil", 850], ["Water", 1000], ["Seawater", 1025], ["Glycerin", 1260], ["Mercury", 13550]];

/* ================= Buoyancy ================= */
function BuoyancyCanvas() {
  const blockY = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const rho = Number(st.sim.bu_rho);
    const rhoF = Number(st.sim.bu_fluid);
    const b = buoyancy(rho, rhoF);
    ctx.clearRect(0, 0, w, h);

    const tankX = w * 0.16; const tankW = w * 0.62;
    const surfY = h * 0.34; const botY = h - 46;
    // fluid
    const depthCol = rhoF > 5000 ? "rgba(200,214,240,0.5)" : "rgba(77,208,255,0.22)";
    ctx.fillStyle = depthCol;
    ctx.fillRect(tankX, surfY, tankW, botY - surfY);
    ctx.strokeStyle = "rgba(77,208,255,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = tankX; x <= tankX + tankW; x += 6) {
      const y = surfY + Math.sin(x * 0.05 + _t * 1.6) * 2;
      if (x === tankX) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // tank walls
    ctx.strokeStyle = "rgba(233,241,255,0.5)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tankX, surfY - 30); ctx.lineTo(tankX, botY); ctx.lineTo(tankX + tankW, botY); ctx.lineTo(tankX + tankW, surfY - 30);
    ctx.stroke();

    const size = 76;
    const cx = tankX + tankW * 0.42;
    let target: number;
    if (b.sinks) target = botY - size / 2 - 3;
    else target = surfY + b.sub * size - size / 2;
    if (blockY.current === 0) blockY.current = target;
    const dy = target - blockY.current;
    blockY.current += dy * clamp(dt * 2.2, 0, 1);
    const by = blockY.current + (b.sinks ? 0 : Math.sin(_t * 1.4) * 2.5);

    // the floating/sinking object — a real asset where we have one
    const objName = Math.abs(rho - 917) < 20 ? "ice" : rho >= 2500 ? "steel" : Math.abs(rho - 2700) > 50 && rho < 1200 ? "ball" : null;
    let drewObj = false;
    if (objName) drewObj = drawObj(ctx, objName, cx, by, size * 1.25, objName === "ball" ? _t * 0.4 : 0);
    if (!drewObj) {
      ctx.save();
      ctx.shadowColor = "rgba(255,138,92,0.5)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ff8a5c";
      ctx.fillRect(cx - size / 2, by - size / 2, size, size);
      ctx.restore();
    }
    ctx.fillStyle = drewObj ? "#e9f1ff" : "#071018";
    ctx.font = "700 11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    if (drewObj) {
      ctx.fillText(`ρ = ${rho} kg/m³`, cx, by + size / 2 + 20);
    } else {
      ctx.fillText(`ρ = ${rho}`, cx, by + 3);
      ctx.fillText("kg/m³", cx, by + 16);
    }

    // force arrows (per kg: weight 9.81 down, buoyancy up)
    const wLen = 46;
    const fLen = clamp(b.sub * 62, 6, 62);
    const arrow = (x: number, y: number, len: number, dir: 1 | -1, color: string, label: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + dir * len); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + dir * (len + 8));
      ctx.lineTo(x - 6, y + dir * (len - 2));
      ctx.lineTo(x + 6, y + dir * (len - 2));
      ctx.closePath(); ctx.fill();
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      ctx.fillText(label, x, y + dir * (len + 22));
    };
    arrow(cx - 56, by, wLen, 1, "#ffb454", "W = mg");
    arrow(cx + 56, by, fLen * (rhoF >= rho ? 1 : rhoF / rho), -1, "#4dd0ff", "F_b = ρfVg");

    // verdict
    const verdict = b.sinks ? "SINKS — ρ_obj > ρ_fluid" : Math.abs(b.ratio - 1) < 0.02 ? "NEUTRAL — ρ matched" : "FLOATS — ρ_obj < ρ_fluid";
    ctx.fillStyle = b.sinks ? "#ff7a9c" : "#39f0c3";
    ctx.font = "700 13px 'IBM Plex Mono', monospace";
    ctx.fillText(verdict, w / 2, 24);
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText(`submerged: ${fmt(b.sub * 100, 0)}%   •   Archimedes: F_b equals the weight of displaced fluid`, w / 2, h - 16);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function BuoyancyUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const rho = Number(sim.bu_rho);
  const rhoF = Number(sim.bu_fluid);
  const b = buoyancy(rho, rhoF);
  const V = 0.01; // 10 L block example
  const Fb = (b.sinks ? rhoF : rho * b.sub / b.sub) * V * 9.81 * (b.sinks ? 1 : 1);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><BuoyancyCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Fluid Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Archimedes' Principle",
          formula: "F_b = ρ_fluid · V_displaced · g",
          vars: [["ρ_obj", `${rho} kg/m³`], ["ρ_fluid", `${rhoF} kg/m³`], ["V (block)", `${V * 1000} L`]],
          steps: b.sinks
            ? [
              `fully submerged: V_disp = V = ${V} m³`,
              `F_b = ${rhoF} × ${V} × 9.81 = ${fmt(rhoF * V * 9.81, 1)} N`,
              `weight = ${rho} × ${V} × 9.81 = ${fmt(rho * V * 9.81, 1)} N > F_b  →  sinks`,
            ]
            : [
              `floats when F_b = weight → submerged fraction = ρ_obj/ρ_f = ${fmt(b.sub, 3)}`,
              `F_b = ${rhoF} × ${fmt(V * b.sub, 4)} × 9.81 = ${fmt(rhoF * V * b.sub * 9.81, 1)} N`,
              `exactly balances weight ${fmt(rho * V * 9.81, 1)} N  →  equilibrium`,
            ],
          result: b.sinks
            ? `sinks — F_b = ${fmt(rhoF * V * 9.81, 1)} N < W = ${fmt(rho * V * 9.81, 1)} N`
            : `floats with ${fmt(b.sub * 100, 1)}% submerged`,
          note: "Ships float because steel shaped around air makes the average density less than water.",
        })} />}
      >
        <Slider label="Object density" unit="kg/m³" min={100} max={3000} step={10} value={rho} onChange={(x) => setSim("bu_rho", x)} />
        <div className="flex flex-wrap gap-1">
          {([["Ice", 917], ["Oak", 700], ["Aluminium", 2700], ["Iron", 7874]] as [string, number][]).map(([n, v]) => (
            <button key={n} onClick={() => setSim("bu_rho", v)}
              className={`rounded border px-1.5 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${Math.abs(rho - v) < 1 ? "border-[rgba(77,208,255,0.6)] text-[#4dd0ff]" : "border-[rgba(96,145,255,0.14)] text-[#5a6d94] hover:text-[#a9bde2]"}`}>{n}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1">
          {FLUIDS.slice(0, 3).map(([n, v]) => (
            <button key={n} onClick={() => setSim("bu_fluid", v)}
              className={`rounded border px-1 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${Math.abs(rhoF - v) < 1 ? "border-[rgba(77,208,255,0.6)] text-[#4dd0ff]" : "border-[rgba(96,145,255,0.14)] text-[#5a6d94] hover:text-[#a9bde2]"}`}>{n}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {FLUIDS.slice(3).map(([n, v]) => (
            <button key={n} onClick={() => setSim("bu_fluid", v)}
              className={`rounded border px-1 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors ${Math.abs(rhoF - v) < 1 ? "border-[rgba(77,208,255,0.6)] text-[#4dd0ff]" : "border-[rgba(96,145,255,0.14)] text-[#5a6d94] hover:text-[#a9bde2]"}`}>{n}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Submerged" value={fmt(b.sub * 100, 0)} unit="%" accent="#4dd0ff" />
          <Stat label="ρ obj / ρ fluid" value={fmt(b.ratio, 2)} unit="×" />
          <Stat label="F_b (10 L block)" value={fmt(Fb, 1)} unit="N" accent="#39f0c3" />
          <Stat label="Weight" value={fmt(rho * V * 9.81, 1)} unit="N" accent="#ffb454" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Venturi / Bernoulli ================= */
function VenturiCanvas() {
  const parts = useRef<{ u: number; lane: number }[]>([]);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const v1 = Number(st.sim.vn_v1);
    const ratio = Number(st.sim.vn_ratio);
    const vn = venturi(v1, ratio);
    ctx.clearRect(0, 0, w, h);
    const cy = h * 0.42;
    const pipeH = 130;
    const cx = w * 0.56;
    const sig = w * 0.085;
    const areaFrac = (x: number) => {
      const d = x - cx;
      return 1 - (1 - 1 / ratio) * Math.exp(-(d * d) / (2 * sig * sig));
    };
    const halfAt = (x: number) => (pipeH / 2) * Math.sqrt(areaFrac(x));

    // pipe walls
    ctx.strokeStyle = "rgba(233,241,255,0.6)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 30; x <= w - 30; x += 4) {
      const y = cy - halfAt(x);
      if (x === 30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.beginPath();
    for (let x = 30; x <= w - 30; x += 4) {
      const y = cy + halfAt(x);
      if (x === 30) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "rgba(77,208,255,0.06)";
    ctx.beginPath();
    for (let x = 30; x <= w - 30; x += 4) ctx.lineTo(x, cy - halfAt(x));
    for (let x = w - 30; x >= 30; x -= 4) ctx.lineTo(x, cy + halfAt(x));
    ctx.closePath();
    ctx.fill();

    // flow particles — speed ∝ 1/area (continuity)
    if (parts.current.length < 60) {
      parts.current.push({ u: Math.random(), lane: Math.random() * 2 - 1 });
    }
    const paused = st.paused;
    for (const p of parts.current) {
      const x = 30 + p.u * (w - 60);
      const frac = areaFrac(x);
      if (!paused) p.u += (dt * v1 * 16) / frac / (w - 60);
      if (p.u > 1) p.u -= 1;
      const xx = 30 + p.u * (w - 60);
      const hf = halfAt(xx) - 8;
      const yy = cy + p.lane * hf;
      const speed = v1 / areaFrac(xx);
      const len = clamp(speed * 2.4, 4, 26);
      ctx.strokeStyle = `rgba(77,208,255,${clamp(0.35 + speed / (v1 * ratio) * 0.5, 0.3, 0.9)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xx - len, yy); ctx.lineTo(xx, yy); ctx.stroke();
    }

    // manometers
    const mano = (x: number, label: string, P: number) => {
      const colH = clamp((P - 60000) / 900, 8, 150);
      const topY = cy - halfAt(x);
      ctx.strokeStyle = "rgba(233,241,255,0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - 5, topY - 150, 10, 150);
      ctx.fillStyle = "#4dd0ff";
      ctx.fillRect(x - 3.5, topY - colH, 7, colH - 2);
      ctx.beginPath(); ctx.moveTo(x, topY); ctx.lineTo(x, topY - 4); ctx.stroke();
      ctx.fillStyle = "#8fa3c8";
      ctx.font = "500 9px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, x, topY - 156);
      ctx.fillStyle = "#e9f1ff";
      ctx.fillText(`${fmt(P / 1000, 1)} kPa`, x, topY - 168);
    };
    mano(w * 0.22, "wide", 101325);
    mano(cx, "throat", vn.P2);

    // labels
    ctx.textAlign = "left";
    ctx.fillStyle = "#4dd0ff";
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText(`v₁ = ${fmt(v1, 1)} m/s`, 34, h - 60);
    ctx.fillText(`v₂ = ${fmt(vn.v2, 1)} m/s`, cx - 40, cy + halfAt(cx) + 34);
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText("fast flow ⇒ low pressure (Bernoulli)", 34, h - 40);
    ctx.fillText("continuity: A₁v₁ = A₂v₂", 34, h - 22);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function VenturiUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const v1 = Number(sim.vn_v1); const ratio = Number(sim.vn_ratio);
  const vn = venturi(v1, ratio);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><VenturiCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Flow Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Bernoulli + Continuity",
          formula: "A₁v₁ = A₂v₂     P + ½ρv² = const",
          vars: [["v₁", `${v1} m/s`], ["A₁/A₂", `${ratio}`], ["ρ (water)", "1000 kg/m³"], ["P₁", "101.3 kPa"]],
          steps: [
            `v₂ = v₁ × (A₁/A₂) = ${v1} × ${ratio} = ${fmt(vn.v2, 2)} m/s`,
            `ΔP = ½ρ(v₁² − v₂²) = 500 × (${fmt(v1 * v1, 0)} − ${fmt(vn.v2 * vn.v2, 0)})`,
            `ΔP = ${fmt(vn.dP / 1000, 2)} kPa  (throat pressure drops)`,
          ],
          result: `P₂ = ${fmt(vn.P2 / 1000, 1)} kPa   •   v₂ = ${fmt(vn.v2, 1)} m/s`,
          note: "This pressure drop lifts airplane wings, feeds carburetors, and makes shower curtains misbehave.",
        })} />}
      >
        <Slider label="Inlet velocity v₁" unit="m/s" min={1} max={10} step={0.5} value={v1} onChange={(x) => setSim("vn_v1", x)} />
        <Slider label="Constriction A₁/A₂" unit="×" min={1.2} max={4.5} step={0.1} value={ratio} onChange={(x) => setSim("vn_ratio", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Throat speed" value={fmt(vn.v2, 1)} unit="m/s" accent="#4dd0ff" />
          <Stat label="Throat P" value={fmt(vn.P2 / 1000, 1)} unit="kPa" />
          <Stat label="ΔP suction" value={fmt(-vn.dP / 1000, 1)} unit="kPa" accent="#ff7b6b" />
          <Stat label="P inlet" value="101.3" unit="kPa" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Hydraulic press ================= */
function HydraulicCanvas() {
  const lift = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const F1 = Number(st.sim.hy_F);
    const ratio = Number(st.sim.hy_ratio);
    const hy = hydraulic(F1, ratio);
    const carW = 15000; // N
    const target = clamp(hy.F2 / carW, 0, 1);
    lift.current += (target - lift.current) * clamp(dt * 2, 0, 1);
    ctx.clearRect(0, 0, w, h);

    const baseY = h - 60;
    const a1x = w * 0.24; const a2x = w * 0.68;
    const r1 = 26; const r2 = 26 + ratio * 0.9;
    const cyl1H = 170; const cyl2H = 210;

    // connecting pipe
    ctx.fillStyle = "rgba(77,208,255,0.14)";
    ctx.fillRect(a1x - r1, baseY - 34, a2x - a1x + r1 + r2, 34);
    ctx.strokeStyle = "rgba(233,241,255,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeRect(a1x - r1, baseY - 34, a2x - a1x + r1 + r2, 34);

    const cyl = (x: number, r: number, ch: number, pistonDrop: number) => {
      ctx.fillStyle = "rgba(77,208,255,0.18)";
      ctx.fillRect(x - r, baseY - ch, r * 2, ch);
      ctx.strokeStyle = "rgba(233,241,255,0.55)";
      ctx.strokeRect(x - r, baseY - ch, r * 2, ch);
      // piston
      const py = baseY - ch + 14 + pistonDrop;
      ctx.fillStyle = "#8fa3c8";
      ctx.fillRect(x - r + 3, py, r * 2 - 6, 12);
      ctx.strokeStyle = "#2a3d66";
      ctx.strokeRect(x - r + 3, py, r * 2 - 6, 12);
      return py;
    };
    const p1y = cyl(a1x, r1, cyl1H, 40 + Math.sin(_t * 2) * 22);
    const p2y = cyl(a2x, Math.min(r2, 96), cyl2H, (1 - lift.current) * 90);

    // force arrow on small piston
    const fLen = clamp(F1 / 20, 18, 90);
    ctx.strokeStyle = "#ffb454";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(a1x, p1y - fLen - 12); ctx.lineTo(a1x, p1y - 10); ctx.stroke();
    ctx.fillStyle = "#ffb454";
    ctx.beginPath(); ctx.moveTo(a1x, p1y - 4); ctx.lineTo(a1x - 7, p1y - 16); ctx.lineTo(a1x + 7, p1y - 16); ctx.closePath(); ctx.fill();
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`F₁ = ${F1} N`, a1x, p1y - fLen - 22);

    // car on big piston
    const carY = p2y - 30 - lift.current * 10;
    ctx.save();
    ctx.shadowColor = "rgba(77,208,255,0.4)";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "#4dd0ff";
    ctx.beginPath();
    ctx.roundRect(a2x - 62, carY - 18, 124, 22, 8);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(a2x - 36, carY - 36, 70, 20, 7);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#071018";
    ctx.beginPath(); ctx.arc(a2x - 34, carY + 4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(a2x + 34, carY + 4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#071018";
    ctx.font = "700 10px 'IBM Plex Mono', monospace";
    ctx.fillText("1 500 kg car", a2x, carY - 6);

    // readouts
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "700 14px 'IBM Plex Mono', monospace";
    ctx.fillText(`F₂ = ${fmt(hy.F2 / 1000, 1)} kN`, a2x, 26);
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText(`Pascal: same pressure everywhere → F₂ = F₁ × A₂/A₁ = F₁ × ${ratio}`, w / 2, h - 16);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function HydraulicUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const F1 = Number(sim.hy_F); const ratio = Number(sim.hy_ratio);
  const hy = hydraulic(F1, ratio);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><HydraulicCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Press Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Pascal's Principle",
          formula: "P = F₁/A₁ = F₂/A₂   →   F₂ = F₁·(A₂/A₁)",
          vars: [["F₁", `${F1} N`], ["A₂/A₁", `${ratio}`]],
          steps: [
            `F₂ = ${F1} × ${ratio} = ${fmt(hy.F2, 0)} N`,
            `F₂ = ${fmt(hy.F2 / 1000, 2)} kN — enough to lift ${fmt(hy.F2 / 9.81, 0)} kg`,
            `trade: small piston must travel ${ratio}× farther (energy conserved)`,
          ],
          result: `F₂ = ${fmt(hy.F2 / 1000, 1)} kN   •   mechanical advantage ${ratio}×`,
          note: "Brakes, excavators and car jacks all multiply force this way — pressure transmits undiminished through a fluid.",
        })} />}
      >
        <Slider label="Input force F₁" unit="N" min={50} max={1500} step={10} value={F1} onChange={(x) => setSim("hy_F", x)} />
        <Slider label="Area ratio A₂/A₁" unit="×" min={5} max={80} step={1} value={ratio} onChange={(x) => setSim("hy_ratio", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Output F₂" value={fmt(hy.F2 / 1000, 1)} unit="kN" accent="#4dd0ff" />
          <Stat label="Lifts" value={fmt(hy.F2 / 9.81, 0)} unit="kg" />
          <Stat label="Car weight" value="1500" unit="kg" accent="#ffb454" />
          <Stat label="Advantage" value={fmt(hy.MA, 0)} unit="×" accent="#39f0c3" />
        </div>
      </ControlPanel>
    </>
  );
}

export default function FluidsWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "buoyancy" && <BuoyancyUI />}
      {exp === "venturi" && <VenturiUI />}
      {exp === "hydraulic" && <HydraulicUI />}
    </div>
  );
}
