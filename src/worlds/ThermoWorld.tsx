import { useRef } from "react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { idealGas, carnot, newtonCooling, R_GAS, fmt, clamp } from "../physics";
import { drawObj, preloadSprites } from "../sprites";

preloadSprites(["flame", "ice"]);

const META = WORLDS.find((w) => w.id === "thermo")!;

/* ================= Ideal gas ================= */
interface GasP { x: number; y: number; vx: number; vy: number }
function GasCanvas() {
  const parts = useRef<GasP[]>([]);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const T = Number(st.sim.gas_T);
    const V = Number(st.sim.gas_V);
    const n = Number(st.sim.gas_n);
    ctx.clearRect(0, 0, w, h);
    const boxW = (V / 40) * (w - 90) + 60;
    const x0 = 40; const y0 = 46; const bx = x0 + boxW; const y1 = h - 40;

    // target particle count
    const target = clamp(Math.round(n * 16), 4, 160);
    while (parts.current.length < target) {
      const a = Math.random() * Math.PI * 2;
      parts.current.push({ x: x0 + 10 + Math.random() * (boxW - 20), y: y0 + 10 + Math.random() * (y1 - y0 - 20), vx: Math.cos(a), vy: Math.sin(a) });
    }
    if (parts.current.length > target) parts.current.length = target;

    const sf = Math.sqrt(T / 300);
    const speed = 130 * sf;
    const paused = st.paused;
    for (const p of parts.current) {
      if (!paused) {
        p.x += p.vx * speed * dt;
        p.y += p.vy * speed * dt;
        if (p.x < x0 + 6) { p.x = x0 + 6; p.vx = Math.abs(p.vx); }
        if (p.x > bx - 6) { p.x = bx - 6; p.vx = -Math.abs(p.vx); }
        if (p.y < y0 + 6) { p.y = y0 + 6; p.vy = Math.abs(p.vy); }
        if (p.y > y1 - 6) { p.y = y1 - 6; p.vy = -Math.abs(p.vy); }
      }
    }

    // temperature color
    const tC = clamp((T - 100) / 800, 0, 1);
    const cr = Math.round(122 + tC * 133);
    const cg = Math.round(184 - tC * 61);
    const cb = Math.round(255 - tC * 148);
    const col = `rgb(${cr},${cg},${cb})`;

    // box walls (piston on the right)
    ctx.strokeStyle = "rgba(233,241,255,0.55)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bx, y0 - 8); ctx.lineTo(x0, y0 - 8); ctx.lineTo(x0, y1 + 8); ctx.lineTo(bx, y1 + 8);
    ctx.stroke();
    // piston
    ctx.fillStyle = "#2a3d66";
    ctx.fillRect(bx, y0 - 14, 16, y1 - y0 + 28);
    ctx.strokeStyle = "#8fa3c8";
    ctx.strokeRect(bx, y0 - 14, 16, y1 - y0 + 28);
    ctx.beginPath(); ctx.moveTo(bx + 16, (y0 + y1) / 2); ctx.lineTo(bx + 46, (y0 + y1) / 2); ctx.stroke();
    // burner flame under the chamber, sized by temperature
    const heat = clamp((T - 100) / 900, 0, 1);
    const bflick = 1 + Math.sin(_t * 16) * 0.14;
    ctx.save();
    ctx.globalAlpha = 0.35 + heat * 0.65;
    drawObj(ctx, "flame", x0 + boxW / 2, y1 + 26, (26 + heat * 42) * bflick, Math.sin(_t * 11) * 0.1);
    ctx.restore();

    // particles
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 7;
    ctx.fillStyle = col;
    for (const p of parts.current) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // thermometer
    const tx = w - 34;
    ctx.strokeStyle = "rgba(233,241,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx - 5, 60, 10, h - 130);
    ctx.fillStyle = col;
    const tFrac = clamp((T - 50) / 1150, 0, 1);
    ctx.fillRect(tx - 3.5, 60 + (h - 130) * (1 - tFrac), 7, (h - 130) * tFrac);
    ctx.beginPath(); ctx.arc(tx, h - 64, 9, 0, Math.PI * 2); ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText(`T = ${T} K`, 44, 30);
    ctx.fillStyle = "#8fa3c8";
    ctx.fillText(`speed ∝ √T`, 130, 30);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function GasUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const T = Number(sim.gas_T); const V = Number(sim.gas_V); const n = Number(sim.gas_n);
  const out = idealGas(n, T, V);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><GasCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Gas Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Ideal Gas Law",
          formula: "PV = nRT     v_rms = √(3RT/M)",
          vars: [["n", `${n} mol`], ["T", `${T} K`], ["V", `${V} L = ${fmt(V / 1000, 4)} m³`], ["R", "8.314 J/(mol·K)"]],
          steps: [
            `P = nRT/V = ${n} × 8.314 × ${T} / ${fmt(V / 1000, 4)}`,
            `P = ${fmt(out.P / 1000, 1)} kPa = ${fmt(out.P / 101325, 2)} atm`,
            `v_rms = √(3 × 8.314 × ${T} / 0.028) = ${fmt(out.rms, 0)} m/s  (N₂)`,
          ],
          result: `P = ${fmt(out.P / 1000, 1)} kPa   •   v_rms = ${fmt(out.rms, 0)} m/s`,
          note: "Particle speed on screen scales with √T — hotter gas, faster molecules, harder wall hits, higher pressure.",
        })} />}
      >
        <Slider label="Temperature" unit="K" min={100} max={1000} step={10} value={T} onChange={(x) => setSim("gas_T", x)} />
        <Slider label="Volume" unit="L" min={4} max={40} step={1} value={V} onChange={(x) => setSim("gas_V", x)} />
        <Slider label="Amount n" unit="mol" min={0.25} max={8} step={0.25} value={n} onChange={(x) => setSim("gas_n", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Pressure" value={fmt(out.P / 1000, 1)} unit="kPa" accent="#ff7b6b" />
          <Stat label="In atm" value={fmt(out.P / 101325, 2)} unit="atm" />
          <Stat label="v rms" value={fmt(out.rms, 0)} unit="m/s" accent="#53e8ff" />
          <Stat label="N molecules" value={(n * 6.022e23).toExponential(1)} unit="" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Carnot engine ================= */
function carnotPath(Th: number, Tc: number) {
  const gamma = 1.4;
  const VA = 1; const VB = 3.2;
  const r = Math.pow(Th / Tc, 1 / (gamma - 1));
  const VC = VB * r;
  const VD = VA * r;
  const P = (V: number, TT: number) => (1 * R_GAS * TT) / V;
  const seg: [number, number][] = [];
  const N = 26;
  for (let i = 0; i <= N; i++) { const V = VA + ((VB - VA) * i) / N; seg.push([V, P(V, Th)]); }
  for (let i = 1; i <= N; i++) { const V = VB + ((VC - VB) * i) / N; seg.push([V, P(VB, Th) * Math.pow(VB / V, gamma)]); }
  for (let i = 1; i <= N; i++) { const V = VC - ((VC - VD) * i) / N; seg.push([V, P(V, Tc)]); }
  for (let i = 1; i < N; i++) { const V = VD + ((VA - VD) * i) / N; seg.push([V, P(VD, Tc) * Math.pow(VD / V, gamma)]); }
  return { seg, VC };
}

function CarnotCanvas() {
  const prog = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const Th = Number(st.sim.cn_Th);
    const Tc = clamp(Number(st.sim.cn_Tc), 100, Th - 20);
    if (!st.paused) prog.current = (prog.current + dt * 0.16) % 1;
    ctx.clearRect(0, 0, w, h);
    const { seg, VC } = carnotPath(Th, Tc);
    const gx = 70; const gy = 54; const gw = w - 120; const gh = h - 110;
    const Vmax = Math.max(VC, 4);
    const Pmax = R_GAS * Th / 1 * 1.08;
    const X = (V: number) => gx + (Math.sqrt(V) / Math.sqrt(Vmax)) * gw;
    const Y = (P: number) => gy + gh - (P / Pmax) * gh;

    // axes
    ctx.strokeStyle = "rgba(233,241,255,0.4)";
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Volume (√scale)", gx + gw / 2, gy + gh + 22);
    ctx.save();
    ctx.translate(20, gy + gh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Pressure", 0, 0);
    ctx.restore();

    // hot/cold reservoirs
    const resW = 90;
    ctx.fillStyle = "rgba(255,123,107,0.2)";
    ctx.fillRect(w - resW - 14, 14, resW, 26);
    ctx.strokeStyle = "#ff7b6b";
    ctx.strokeRect(w - resW - 14, 14, resW, 26);
    ctx.fillStyle = "#ff7b6b";
    ctx.fillText(`hot ${Th} K`, w - resW / 2 - 14, 31);
    // fire feeding the hot reservoir
    const flick = 1 + Math.sin(_t * 14) * 0.12;
    drawObj(ctx, "flame", w - resW - 40, 27, 44 * flick, Math.sin(_t * 9) * 0.12);
    ctx.fillStyle = "rgba(83,232,255,0.16)";
    ctx.fillRect(w - resW - 14, h - 42, resW, 26);
    ctx.strokeStyle = "#53e8ff";
    ctx.strokeRect(w - resW - 14, h - 42, resW, 26);
    ctx.fillStyle = "#53e8ff";
    ctx.fillText(`cold ${Math.round(Tc)} K`, w - resW / 2 - 14, h - 25);
    // ice sink
    drawObj(ctx, "ice", w - resW - 40, h - 29, 36);

    // cycle
    ctx.strokeStyle = "rgba(255,123,107,0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    seg.forEach(([V, P], i) => {
      if (i === 0) ctx.moveTo(X(V), Y(P)); else ctx.lineTo(X(V), Y(P));
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(255,123,107,0.08)";
    ctx.fill();
    ctx.stroke();

    // moving working point
    const idx = Math.floor(prog.current * (seg.length - 1));
    const [cv, cp] = seg[idx];
    ctx.save();
    ctx.shadowColor = "#ffb454";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ffb454";
    ctx.beginPath(); ctx.arc(X(cv), Y(cp), 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // stage label + heat arrows
    const frac = prog.current * 4;
    let stage = "";
    if (frac < 1) stage = "1 → 2  isothermal expansion  •  absorbs Qh";
    else if (frac < 2) stage = "2 → 3  adiabatic expansion  •  cools";
    else if (frac < 3) stage = "3 → 4  isothermal compression  •  rejects Qc";
    else stage = "4 → 1  adiabatic compression  •  heats";
    ctx.fillStyle = "#e9f1ff";
    ctx.textAlign = "left";
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.fillText(stage, gx + 6, 24);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function CarnotUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const Th = Number(sim.cn_Th);
  const Tc = clamp(Number(sim.cn_Tc), 100, Th - 20);
  const c = carnot(Th, Tc);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><CarnotCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Engine Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Carnot Efficiency",
          formula: "η = 1 − Tc/Th     W = η·Qh",
          vars: [["Th", `${Th} K`], ["Tc", `${Math.round(Tc)} K`], ["Qh (per cycle)", `${c.Qh} J`]],
          steps: [
            `η = 1 − ${Math.round(Tc)}/${Th} = ${fmt(c.eff, 4)}`,
            `W = η × Qh = ${fmt(c.eff, 3)} × ${c.Qh} = ${fmt(c.W, 0)} J`,
            `Qc = Qh − W = ${fmt(c.Qc, 0)} J  dumped to the cold reservoir`,
          ],
          result: `η = ${fmt(c.eff * 100, 1)} %  — the maximum any engine can reach between these temperatures`,
          note: "Carnot's theorem: no real engine beats this. Your car manages roughly a third of its own Carnot limit.",
        })} />}
      >
        <Slider label="Hot reservoir Th" unit="K" min={350} max={1000} step={10} value={Th} onChange={(x) => setSim("cn_Th", x)} />
        <Slider label="Cold reservoir Tc" unit="K" min={100} max={Math.max(110, Th - 20)} step={10} value={Tc} onChange={(x) => setSim("cn_Tc", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Efficiency η" value={fmt(c.eff * 100, 1)} unit="%" accent="#ff7b6b" />
          <Stat label="Work / cycle" value={fmt(c.W, 0)} unit="J" accent="#ffb454" />
          <Stat label="Qh in" value={fmt(c.Qh, 0)} unit="J" />
          <Stat label="Qc out" value={fmt(c.Qc, 0)} unit="J" accent="#53e8ff" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Raise Th or lower Tc — efficiency only cares about the temperature ratio.</p>
      </ControlPanel>
    </>
  );
}

/* ================= Newton's cooling ================= */
function CoolingCanvas() {
  const tAcc = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const T0 = Number(st.sim.cl_T0);
    const Tenv = Number(st.sim.cl_Tenv);
    const k = Number(st.sim.cl_k);
    if (!st.paused) tAcc.current = (tAcc.current + dt * 6) % 190;
    ctx.clearRect(0, 0, w, h);
    const tNow = tAcc.current;
    const Tnow = newtonCooling(T0, Tenv, k, tNow);

    // graph
    const gx = 60; const gy = 40; const gw = w - 110; const gh = h - 100;
    const Tmax = Math.max(T0, Tenv) + 10;
    const X = (t: number) => gx + (t / 180) * gw;
    const Y = (TT: number) => gy + gh - ((TT - 0) / Tmax) * gh;
    ctx.strokeStyle = "rgba(233,241,255,0.35)";
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    // environment line
    ctx.strokeStyle = "rgba(83,232,255,0.55)";
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(gx, Y(Tenv)); ctx.lineTo(gx + gw, Y(Tenv)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#53e8ff";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`room ${Tenv}°C`, gx + gw - 76, Y(Tenv) - 6);
    // curve
    ctx.strokeStyle = "#ff7b6b";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 180; i += 2) {
      const TT = newtonCooling(T0, Tenv, k, i);
      if (i === 0) ctx.moveTo(X(i), Y(TT)); else ctx.lineTo(X(i), Y(TT));
    }
    ctx.stroke();
    // marker + mug
    const mT = newtonCooling(T0, Tenv, k, tNow);
    const mx = X(tNow); const my = Y(mT);
    ctx.save();
    ctx.shadowColor = "#ff7b6b";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff7b6b";
    ctx.beginPath(); ctx.arc(mx, my, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText(`T(${fmt(tNow, 0)}s) = ${fmt(mT, 1)} °C`, gx + 8, 26);

    // cooling mug (right)
    const cxp = w - 34;
    const heat = clamp((mT - Tenv) / Math.max(1, T0 - Tenv), 0, 1);
    ctx.strokeStyle = "#8fa3c8";
    ctx.lineWidth = 2;
    ctx.strokeRect(cxp - 16, h * 0.3, 32, 44);
    ctx.beginPath(); ctx.arc(cxp + 16, h * 0.3 + 22, 10, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    ctx.fillStyle = `rgba(255,123,107,${0.15 + heat * 0.6})`;
    ctx.fillRect(cxp - 14, h * 0.3 + 2, 28, 40);
    // steam when hot
    if (heat > 0.25) {
      ctx.strokeStyle = `rgba(255,255,255,${heat * 0.4})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const sx = cxp - 8 + i * 8;
        const ph = _t * 2 + i;
        ctx.beginPath();
        ctx.moveTo(sx, h * 0.3 - 6);
        ctx.quadraticCurveTo(sx + Math.sin(ph) * 6, h * 0.3 - 20, sx, h * 0.3 - 34 - heat * 8);
        ctx.stroke();
      }
    }
    ctx.fillStyle = "#8fa3c8";
    ctx.fillText("τ = 1/k", cxp - 20, h * 0.3 + 64);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function CoolingUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const T0 = Number(sim.cl_T0); const Tenv = Number(sim.cl_Tenv); const k = Number(sim.cl_k);
  const T60 = newtonCooling(T0, Tenv, k, 60);
  const tau = 1 / k;
  const toWithin5 = T0 - Tenv > 5 ? Math.log((T0 - Tenv) / 5) / k : 0;
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><CoolingCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Cooling Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Newton's Law of Cooling",
          formula: "T(t) = T_env + (T₀ − T_env)·e^(−kt)",
          vars: [["T₀", `${T0} °C`], ["T_env", `${Tenv} °C`], ["k", `${k} s⁻¹`], ["τ = 1/k", `${fmt(tau, 1)} s`]],
          steps: [
            `T(60) = ${Tenv} + ${fmt(T0 - Tenv, 1)} × e^(−${k}×60)`,
            `T(60) = ${fmt(T60, 2)} °C`,
            `after each τ = ${fmt(tau, 1)} s the gap shrinks by e ≈ 2.718×`,
          ],
          result: `T(60 s) = ${fmt(T60, 1)} °C  •  ~room temp in ${fmt(toWithin5, 0)} s`,
          note: "The gap decays exponentially — hot things cool fast at first, then crawl toward room temperature.",
        })} />}
      >
        <Slider label="Initial temperature" unit="°C" min={40} max={120} step={1} value={T0} onChange={(x) => setSim("cl_T0", x)} />
        <Slider label="Room temperature" unit="°C" min={0} max={35} step={1} value={Tenv} onChange={(x) => setSim("cl_Tenv", x)} />
        <Slider label="Cooling constant k" unit="s⁻¹" min={0.01} max={0.2} step={0.005} value={k} onChange={(x) => setSim("cl_k", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="T at 60 s" value={fmt(T60, 1)} unit="°C" accent="#ff7b6b" />
          <Stat label="Time const. τ" value={fmt(tau, 1)} unit="s" />
          <Stat label="ΔT now" value={fmt(T0 - Tenv, 0)} unit="°C" accent="#53e8ff" />
          <Stat label="≈ room temp in" value={fmt(toWithin5, 0)} unit="s" />
        </div>
      </ControlPanel>
    </>
  );
}

export default function ThermoWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "gas" && <GasUI />}
      {exp === "carnot" && <CarnotUI />}
      {exp === "cooling" && <CoolingUI />}
    </div>
  );
}
