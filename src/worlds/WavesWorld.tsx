import { useRef } from "react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { waveY, waveSpeed, dopplerShift, V_SOUND, fmt, clamp } from "../physics";

const META = WORLDS.find((w) => w.id === "waves")!;

/* ================= Wave tank ================= */
function WaveCanvas() {
  const ref = useCanvasLoop((ctx, w, h, t) => {
    const A = Number(useStore.getState().sim.wv_A);
    const f = Number(useStore.getState().sim.wv_f);
    const lambda = Number(useStore.getState().sim.wv_l);
    const ph = Number(useStore.getState().sim.wv_ph);
    ctx.clearRect(0, 0, w, h);
    const PXM = w / 12; // 12 m window
    const midY = h * 0.52;
    const ampPx = A * h * 0.3;

    // axis
    ctx.strokeStyle = "rgba(96,145,255,0.25)";
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(w, midY); ctx.stroke();
    ctx.setLineDash([]);

    // medium particles (transverse comb)
    for (let x = 12; x < w; x += 17) {
      const y = waveY(A, f, lambda, ph, x / PXM, t) * h * 0.3;
      ctx.strokeStyle = "rgba(57,240,195,0.22)";
      ctx.beginPath(); ctx.moveTo(x, midY); ctx.lineTo(x, midY - y); ctx.stroke();
      ctx.fillStyle = "rgba(57,240,195,0.85)";
      ctx.beginPath(); ctx.arc(x, midY - y, 2.2, 0, Math.PI * 2); ctx.fill();
    }

    // main curve
    ctx.save();
    ctx.shadowColor = "rgba(57,240,195,0.8)";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#39f0c3";
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 3) {
      const y = waveY(A, f, lambda, ph, x / PXM, t) * h * 0.3;
      if (x === 0) ctx.moveTo(x, midY - y);
      else ctx.lineTo(x, midY - y);
    }
    ctx.stroke();
    ctx.restore();

    // amplitude guide
    ctx.strokeStyle = "rgba(255,180,84,0.5)";
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(0, midY - ampPx); ctx.lineTo(w, midY - ampPx); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, midY + ampPx); ctx.lineTo(w, midY + ampPx); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffb454";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`A = ${A} m`, 8, midY - ampPx - 5);

    // scale bar: 1 m
    ctx.strokeStyle = "rgba(233,241,255,0.5)";
    ctx.beginPath(); ctx.moveTo(14, h - 18); ctx.lineTo(14 + PXM, h - 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14, h - 22); ctx.lineTo(14, h - 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14 + PXM, h - 22); ctx.lineTo(14 + PXM, h - 14); ctx.stroke();
    ctx.fillStyle = "rgba(233,241,255,0.6)";
    ctx.fillText("1 m", 14 + PXM / 2 - 8, h - 24);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function WaveUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const A = Number(sim.wv_A); const f = Number(sim.wv_f); const l = Number(sim.wv_l); const ph = Number(sim.wv_ph);
  const v = waveSpeed(f, l);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><WaveCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Wave Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Traveling Wave",
          formula: "y(x,t) = A sin(kx − ωt + φ)    v = f·λ",
          vars: [["A", `${A} m`], ["f", `${f} Hz`], ["λ", `${l} m`], ["φ", `${fmt(ph, 2)} rad`], ["k = 2π/λ", `${fmt((2 * Math.PI) / l, 2)} rad/m`], ["ω = 2πf", `${fmt(2 * Math.PI * f, 2)} rad/s`]],
          steps: [`v = f × λ = ${f} × ${l} = ${fmt(v)} m/s`, `T = 1/f = ${fmt(1 / f, 3)} s`],
          result: `v = ${fmt(v)} m/s  — speed is set by f·λ, the medium carries it`,
          note: "The comb of oscillators shows the medium; the curve is the wave traveling through it.",
        })} />}
      >
        <Slider label="Amplitude" unit="m" min={0.1} max={1} step={0.05} value={A} onChange={(x) => setSim("wv_A", x)} />
        <Slider label="Frequency" unit="Hz" min={0.2} max={3} step={0.05} value={f} onChange={(x) => setSim("wv_f", x)} />
        <Slider label="Wavelength" unit="m" min={0.5} max={5} step={0.05} value={l} onChange={(x) => setSim("wv_l", x)} />
        <Slider label="Phase φ" unit="rad" min={0} max={6.28} step={0.05} value={ph} onChange={(x) => setSim("wv_ph", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Speed v = fλ" value={fmt(v, 2)} unit="m/s" accent="#39f0c3" />
          <Stat label="Period" value={fmt(1 / f, 2)} unit="s" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Interference ================= */
function InterferenceCanvas() {
  const off = useRef<HTMLCanvasElement | null>(null);
  const ref = useCanvasLoop((ctx, w, h, t) => {
    const d = Number(useStore.getState().sim.if_d);
    const f = Number(useStore.getState().sim.if_f);
    const ph = (Number(useStore.getState().sim.if_ph) * Math.PI) / 180;
    ctx.clearRect(0, 0, w, h);
    const PXM = h / 9;
    const lambda = 3 / f; // v = 3 m/s model medium
    const k = (2 * Math.PI) / lambda;
    const omega = 2 * Math.PI * f;
    const sx = w * 0.16;
    const s1y = h / 2 - (d / 2) * PXM;
    const s2y = h / 2 + (d / 2) * PXM;

    const cell = 7;
    const cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    if (!off.current) off.current = document.createElement("canvas");
    if (off.current.width !== cols || off.current.height !== rows) {
      off.current.width = cols; off.current.height = rows;
    }
    const octx = off.current.getContext("2d")!;
    const img = octx.createImageData(cols, rows);
    const data = img.data;
    for (let j = 0; j < rows; j++) {
      const py = j * cell;
      for (let i = 0; i < cols; i++) {
        const px = i * cell;
        const r1 = Math.hypot(px - sx, py - s1y) / PXM;
        const r2 = Math.hypot(px - sx, py - s2y) / PXM;
        const A = Math.sin(k * r1 - omega * t) + Math.sin(k * r2 - omega * t + ph);
        const idx = (j * cols + i) * 4;
        const mag = Math.abs(A) / 2;
        if (A > 0) { data[idx] = 30 + 40 * mag; data[idx + 1] = 90 + 150 * mag; data[idx + 2] = 80 + 115 * mag; }
        else { data[idx] = 20 + 30 * mag; data[idx + 1] = 40 + 50 * mag; data[idx + 2] = 90 + 120 * mag; }
        data[idx + 3] = 40 + 190 * mag;
      }
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off.current, 0, 0, w, h);

    // sources
    for (const sy of [s1y, s2y]) {
      const pulse = 5 + Math.sin(omega * t) * 2;
      ctx.save();
      ctx.shadowColor = "rgba(57,240,195,0.9)";
      ctx.shadowBlur = 14;
      ctx.fillStyle = "#39f0c3";
      ctx.beginPath(); ctx.arc(sx, sy, pulse, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "rgba(233,241,255,0.6)";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`S₁`, sx + 12, s1y + 3);
    ctx.fillText(`S₂`, sx + 12, s2y + 3);
    ctx.fillText("bright bands = constructive • dark = destructive", 12, h - 12);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function InterferenceUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const d = Number(sim.if_d); const f = Number(sim.if_f); const ph = Number(sim.if_ph);
  const lambda = 3 / f;
  const fringe = (lambda * 4) / d; // approx fringe spacing at a screen 4 m away
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><InterferenceCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Source Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Two-Source Interference",
          formula: "Δφ = k·Δr + φ₀    I ∝ 4A²cos²(Δφ/2)",
          vars: [["f", `${f} Hz`], ["v (medium)", "3 m/s"], ["λ = v/f", `${fmt(lambda, 2)} m`], ["d", `${d} m`], ["Δφ₀", `${ph}°`]],
          steps: [
            `constructive: Δr = nλ  (crests meet crests)`,
            `destructive: Δr = (n + ½)λ  (crests meet troughs)`,
            `fringe spacing ≈ λL/d = ${fmt(fringe, 2)} m  (screen 4 m away)`,
          ],
          result: `λ = ${fmt(lambda, 2)} m   •   fringe spacing ≈ ${fmt(fringe, 2)} m`,
          note: "Medium speed fixed at 3 m/s for visibility — the superposition math is exact.",
        })} />}
      >
        <Slider label="Frequency (both sources)" unit="Hz" min={0.5} max={2.5} step={0.05} value={f} onChange={(x) => setSim("if_f", x)} />
        <Slider label="Phase difference Δφ" unit="deg" min={0} max={360} step={5} value={ph} onChange={(x) => setSim("if_ph", x)} />
        <Slider label="Source separation d" unit="m" min={0.5} max={4} step={0.1} value={d} onChange={(x) => setSim("if_d", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Wavelength" value={fmt(lambda, 2)} unit="m" accent="#39f0c3" />
          <Stat label="Fringe spacing" value={fmt(fringe, 2)} unit="m" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Set Δφ = 0° for perfect constructive interference — Mission 05 uses exactly this.</p>
      </ControlPanel>
    </>
  );
}

/* ================= Doppler ================= */
interface Front { x: number; y: number; r: number }
function DopplerCanvas() {
  const fronts = useRef<Front[]>([]);
  const src = useRef({ x: 60, acc: 0, pulse: 0 });
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const vs = Number(useStore.getState().sim.dp_vs);
    const f0 = Number(useStore.getState().sim.dp_f);
    ctx.clearRect(0, 0, w, h);
    const PX = 1.5;
    const v = V_SOUND;
    const paused = useStore.getState().paused;
    const sy = h * 0.52;
    const s = src.current;
    if (!paused) {
      s.x += vs * PX * dt;
      if (s.x > w - 130) s.x = 40;
      const Tv = clamp((1 / f0) * Math.ceil(f0 / 5), 0.16, 0.9);
      s.acc += dt;
      if (s.acc > Tv) { s.acc = 0; fronts.current.push({ x: s.x, y: sy, r: 4 }); }
      for (const fr of fronts.current) fr.r += v * PX * dt;
      fronts.current = fronts.current.filter((fr) => fr.r < Math.hypot(w, h));
    }
    for (const fr of fronts.current) {
      const a = clamp(0.5 - fr.r / 900, 0.05, 0.5);
      ctx.strokeStyle = `rgba(57,240,195,${a})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(fr.x, fr.y, fr.r, 0, Math.PI * 2); ctx.stroke();
    }
    // source (ambulance-style)
    ctx.save();
    ctx.shadowColor = "rgba(255,180,84,0.9)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#ffb454";
    ctx.beginPath(); ctx.arc(s.x, sy, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#071018";
    ctx.font = "700 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("S", s.x, sy + 3.5);
    // velocity arrow
    if (Math.abs(vs) > 1) {
      ctx.strokeStyle = "#ffb454";
      ctx.beginPath(); ctx.moveTo(s.x - 26, sy - 20); ctx.lineTo(s.x + 26, sy - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x + 26, sy - 20); ctx.lineTo(s.x + 18, sy - 25); ctx.moveTo(s.x + 26, sy - 20); ctx.lineTo(s.x + 18, sy - 15); ctx.stroke();
      ctx.fillStyle = "#ffb454";
      ctx.fillText(`${vs} m/s`, s.x, sy - 28);
    }
    // observer
    const ox = w - 64;
    const { fObs } = dopplerShift(f0, vs, Number(useStore.getState().sim.dp_vo));
    if (!paused) { s.pulse += dt * clamp((fObs / f0) * 2, 0.5, 6); }
    const pr = 8 + (s.pulse % 1) * 14;
    ctx.strokeStyle = `rgba(83,232,255,${1 - (s.pulse % 1)})`;
    ctx.beginPath(); ctx.arc(ox, sy, pr, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.shadowColor = "rgba(83,232,255,0.9)";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#53e8ff";
    ctx.beginPath(); ctx.arc(ox, sy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#071018";
    ctx.fillText("O", ox, sy + 3.5);
    ctx.fillStyle = "#8fa3c8";
    ctx.fillText("observer", ox, sy + 26);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function DopplerUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const vs = Number(sim.dp_vs); const vo = Number(sim.dp_vo); const f0 = Number(sim.dp_f);
  const { fObs, factor } = dopplerShift(f0, vs, vo);
  const shift = factor > 1.005 ? "BLUE-SHIFTED (higher pitch)" : factor < 0.995 ? "RED-SHIFTED (lower pitch)" : "NO SHIFT";
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full">
          <div className="relative h-full w-full">
            <DopplerCanvas />
            <div className="absolute left-3 top-3 space-y-1">
              <div className="rounded-md border border-[rgba(96,145,255,0.16)] bg-[rgba(7,11,22,0.78)] px-2.5 py-1.5 backdrop-blur-md">
                <span className="num text-[11px] text-[#53e8ff]">f′ = {fmt(fObs, 0)} Hz</span>
              </div>
              <div className="rounded-md border border-[rgba(96,145,255,0.16)] bg-[rgba(7,11,22,0.78)] px-2.5 py-1.5 backdrop-blur-md">
                <span className="num text-[10px] text-[#ffb454]">{shift}</span>
              </div>
            </div>
          </div>
        </CanvasFrame>
      </div>
      <ControlPanel
        title="Doppler Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Doppler Effect",
          formula: "f′ = f · (v + v_o) / (v − v_s)",
          vars: [["f", `${f0} Hz`], ["v (sound)", `${V_SOUND} m/s`], ["v_s (source → observer)", `${vs} m/s`], ["v_o (observer → source)", `${vo} m/s`]],
          steps: [
            `f′ = ${f0} × (${V_SOUND} + ${vo}) / (${V_SOUND} − ${vs})`,
            `f′ = ${f0} × ${fmt((V_SOUND + vo) / (V_SOUND - vs), 4)}`,
            `f′ = ${fmt(fObs, 1)} Hz`,
          ],
          result: `f′ = ${fmt(fObs, 1)} Hz  (${fmt(factor, 3)}× the emitted frequency)`,
          note: "Wavefronts are drawn compressed ahead of the moving source — exactly why the pitch rises.",
        })} />}
      >
        <Slider label="Source velocity → observer" unit="m/s" min={0} max={300} step={5} value={vs} onChange={(x) => setSim("dp_vs", x)} />
        <Slider label="Observer velocity → source" unit="m/s" min={-150} max={150} step={5} value={vo} onChange={(x) => setSim("dp_vo", x)} />
        <Slider label="Emitted frequency" unit="Hz" min={200} max={1200} step={10} value={f0} onChange={(x) => setSim("dp_f", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Observed f′" value={fmt(fObs, 0)} unit="Hz" accent="#53e8ff" />
          <Stat label="Ratio f′/f" value={fmt(factor, 3)} unit="×" />
        </div>
      </ControlPanel>
    </>
  );
}

export default function WavesWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "wave" && <WaveUI />}
      {exp === "interference" && <InterferenceUI />}
      {exp === "doppler" && <DopplerUI />}
    </div>
  );
}
