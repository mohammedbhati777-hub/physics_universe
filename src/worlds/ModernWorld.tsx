import { useEffect, useRef } from "react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { lorentz, photoelectric, fissionEnergy, fmt, clamp } from "../physics";

const META = WORLDS.find((w) => w.id === "modern")!;

/* ================= Time dilation ================= */
function DilationCanvas() {
  const earthT = useRef(0);
  const shipT = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const beta = Number(useStore.getState().sim.td_v);
    const g = lorentz(beta);
    if (!useStore.getState().paused) {
      earthT.current += dt * 0.6; // 1 real second ≈ 0.6 years
      shipT.current += (dt * 0.6) / g;
    }
    ctx.clearRect(0, 0, w, h);
    const cy = h * 0.44;
    const R = Math.min(w * 0.16, 92);

    const clock = (cx: number, label: string, time: number, color: string, speedLines: boolean) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.strokeStyle = "rgba(233,241,255,0.4)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (R - 8), cy + Math.sin(a) * (R - 8));
        ctx.lineTo(cx + Math.cos(a) * (R - 2), cy + Math.sin(a) * (R - 2));
        ctx.stroke();
      }
      // hand: one revolution per 10 time units
      const a = (time / 10) * Math.PI * 2 - Math.PI / 2;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18)); ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = "center";
      ctx.font = "700 12px 'IBM Plex Mono', monospace";
      ctx.fillStyle = "#e9f1ff";
      ctx.fillText(label, cx, cy + R + 24);
      ctx.fillStyle = color;
      ctx.font = "600 14px 'IBM Plex Mono', monospace";
      ctx.fillText(`${fmt(time, 1)} yr`, cx, cy + R + 44);
      if (speedLines && beta > 0.05) {
        ctx.strokeStyle = `rgba(255,92,168,${clamp(beta, 0.1, 0.7)})`;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 5; i++) {
          const ly = cy - R + 20 + i * ((R * 2 - 40) / 4);
          const len = beta * 90;
          const off = (_t * 260 * beta + i * 47) % (w * 0.5);
          ctx.beginPath();
          ctx.moveTo(cx - R - 30 - off * 0.3, ly);
          ctx.lineTo(cx - R - 30 - off * 0.3 - len, ly);
          ctx.stroke();
        }
      }
    };
    clock(w * 0.28, "EARTH twin", earthT.current, "#53e8ff", false);
    clock(w * 0.72, "SHIP twin", shipT.current, "#ff5ca8", true);

    // between: gamma readout
    ctx.textAlign = "center";
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "700 15px 'IBM Plex Mono', monospace";
    ctx.fillText(`γ = ${fmt(g, 3)}`, w / 2, cy - 8);
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText(`at v = ${fmt(beta, 2)}c`, w / 2, cy + 12);
    const gap = earthT.current - shipT.current;
    ctx.fillStyle = "#39f0c3";
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillText(`ship twin is ${fmt(gap, 2)} yr younger`, w / 2, cy + 34);
    ctx.fillStyle = "#5a6d94";
    ctx.fillText("moving clocks run slow — Δt = γ·Δτ", w / 2, h - 14);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function DilationUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const beta = Number(sim.td_v);
  const g = lorentz(beta);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><DilationCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Velocity Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Time Dilation",
          formula: "Δt = γ·Δτ     γ = 1/√(1 − v²/c²)",
          vars: [["v", `${fmt(beta, 2)} c`], ["γ", fmt(g, 4)]],
          steps: [
            `γ = 1/√(1 − ${fmt(beta, 2)}²) = 1/√(${fmt(1 - beta * beta, 4)}) = ${fmt(g, 4)}`,
            `1 year on the ship = ${fmt(g, 2)} years on Earth`,
            `GPS satellites (v ≈ 14 000 km/h) age ~7 µs/day slower — and engineers correct for it`,
          ],
          result: `γ = ${fmt(g, 3)}  — the ship's clock ticks ${fmt(1 / g, 3)}× as fast`,
          note: "Both twins see the other's clock run slow; the asymmetry comes from the ship turning around.",
        })} />}
      >
        <Slider label="Ship velocity (fraction of c)" unit="c" min={0} max={0.95} step={0.01} value={beta} onChange={(x) => setSim("td_v", x)} />
        <div className="flex gap-1">
          {([["0.5c", 0.5], ["0.9c", 0.9], ["0.95c", 0.95]] as [string, number][]).map(([n, v]) => (
            <button key={n} onClick={() => setSim("td_v", v)}
              className="flex-1 rounded border border-[rgba(96,145,255,0.14)] px-1 py-1 font-mono text-[9px] uppercase tracking-wider text-[#5a6d94] hover:text-[#ff5ca8]">{n}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Lorentz γ" value={fmt(g, 3)} unit="" accent="#ff5ca8" />
          <Stat label="Ship tick rate" value={fmt(1 / g, 3)} unit="×" />
          <Stat label="1 ship year =" value={fmt(g, 2)} unit="yr Earth" accent="#53e8ff" />
          <Stat label="v in km/s" value={fmt(beta * 299792, 0)} unit="km/s" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Photoelectric effect ================= */
const METALS: [string, number, string][] = [["Cesium", 2.1, "#e8b83a"], ["Sodium", 2.28, "#b9c6de"], ["Zinc", 4.33, "#8fa3c8"], ["Copper", 4.7, "#c96a3c"]];

function freqToColor(fTHz: number) {
  const lambda = 299792 / fTHz; // nm
  if (lambda < 380) return { c: "#b18cff", label: "UV" };
  if (lambda > 750) return { c: "#7a3b2e", label: "IR" };
  if (lambda < 450) return { c: "#7a5cff", label: "violet" };
  if (lambda < 485) return { c: "#4d7dff", label: "blue" };
  if (lambda < 500) return { c: "#4dd0ff", label: "cyan" };
  if (lambda < 565) return { c: "#4dff88", label: "green" };
  if (lambda < 590) return { c: "#ffe14d", label: "yellow" };
  if (lambda < 625) return { c: "#ffa64d", label: "orange" };
  return { c: "#ff5c5c", label: "red" };
}

interface Photon { x: number; y: number; sp: number }
interface Electron { x: number; y: number; vx: number; vy: number; life: number }
function PhotoelectricCanvas() {
  const photons = useRef<Photon[]>([]);
  const electrons = useRef<Electron[]>([]);
  const acc = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    const f = Number(st.sim.pe_f);
    const I = Number(st.sim.pe_I);
    const mi = clamp(Math.round(Number(st.sim.pe_metal)), 0, 3);
    const pe = photoelectric(f, METALS[mi][1]);
    const col = freqToColor(f);
    ctx.clearRect(0, 0, w, h);
    const paused = st.paused;

    const lampX = w * 0.14; const plateX = w * 0.72;
    const cy = h * 0.5;

    // lamp
    ctx.save();
    ctx.shadowColor = col.c;
    ctx.shadowBlur = 20;
    ctx.fillStyle = col.c;
    ctx.beginPath(); ctx.arc(lampX, cy, 17, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`light: ${col.label}`, lampX, cy + 36);
    ctx.fillText(`${f} THz`, lampX, cy + 50);

    // beam
    ctx.fillStyle = `${col.c}22`;
    ctx.beginPath();
    ctx.moveTo(lampX + 16, cy - 6);
    ctx.lineTo(plateX, cy - 26);
    ctx.lineTo(plateX, cy + 26);
    ctx.lineTo(lampX + 16, cy + 6);
    ctx.closePath();
    ctx.fill();

    // metal plate
    ctx.fillStyle = METALS[mi][2];
    ctx.fillRect(plateX, cy - 70, 14, 140);
    ctx.fillStyle = "#071018";
    ctx.font = "700 9px 'IBM Plex Mono', monospace";
    ctx.fillText(METALS[mi][0].toUpperCase(), plateX + 7, cy - 80);

    // spawn photons
    if (!paused) {
      acc.current += dt * (I / 100) * 26;
      while (acc.current > 1 && photons.current.length < 60) {
        acc.current -= 1;
        photons.current.push({ x: lampX + 20, y: cy + (Math.random() - 0.5) * 14, sp: 300 + Math.random() * 80 });
      }
    }
    // advance photons
    const np: Photon[] = [];
    for (const p of photons.current) {
      if (!paused) p.x += p.sp * dt;
      if (p.x >= plateX - 2) {
        if (pe.ejects) {
          const speed = 60 + Math.sqrt(Math.max(0, pe.KE)) * 130;
          electrons.current.push({ x: plateX - 6, y: p.y + (Math.random() - 0.5) * 60, vx: -speed, vy: (Math.random() - 0.5) * speed * 0.5, life: 1 });
        }
        continue;
      }
      // photon dot with wave wiggle
      ctx.fillStyle = col.c;
      ctx.beginPath(); ctx.arc(p.x, p.y + Math.sin(p.x * 0.12) * 2.5, 2.4, 0, Math.PI * 2); ctx.fill();
      np.push(p);
    }
    photons.current = np;

    // electrons
    const ne: Electron[] = [];
    for (const e of electrons.current) {
      if (!paused) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.life -= dt * 0.55;
      }
      if (e.life > 0 && e.x > 10) {
        ctx.save();
        ctx.shadowColor = "#39f0c3";
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(57,240,195,${clamp(e.life, 0, 1)})`;
        ctx.beginPath(); ctx.arc(e.x, e.y, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ne.push(e);
      }
    }
    electrons.current = ne;

    // verdict + energy ledger
    ctx.textAlign = "left";
    if (pe.ejects) {
      ctx.fillStyle = "#39f0c3";
      ctx.font = "700 13px 'IBM Plex Mono', monospace";
      ctx.fillText(`electrons ejected — KE = ${fmt(pe.KE, 2)} eV`, 24, 26);
    } else {
      ctx.fillStyle = "#ff7a9c";
      ctx.font = "700 13px 'IBM Plex Mono', monospace";
      ctx.fillText(`no emission — photon ${fmt(pe.Eev, 2)} eV < φ = ${METALS[mi][1]} eV`, 24, 26);
      ctx.fillStyle = "#8fa3c8";
      ctx.font = "500 10px 'IBM Plex Mono', monospace";
      ctx.fillText("brighter light won't help; only higher frequency will (Einstein, 1905)", 24, 44);
    }
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText(`threshold f₀ = ${fmt(pe.f0THz, 0)} THz`, 24, h - 16);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function PhotoelectricUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const f = Number(sim.pe_f);
  const I = Number(sim.pe_I);
  const mi = clamp(Math.round(Number(sim.pe_metal)), 0, 3);
  const phi = METALS[mi][1];
  const pe = photoelectric(f, phi);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><PhotoelectricCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Light Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Photoelectric Effect",
          formula: "KE_max = hf − φ",
          vars: [["h", "4.136 × 10⁻¹⁵ eV·s"], ["f", `${f} THz`], ["φ", `${phi} eV (${METALS[mi][0]})`]],
          steps: [
            `E_photon = hf = ${fmt(f / 1000 * 4.136, 3)} eV`,
            `KE = ${fmt(f / 1000 * 4.136, 3)} − ${phi} = ${fmt(pe.KE, 3)} eV`,
            pe.ejects ? `electrons leave with up to ${fmt(pe.KE, 2)} eV` : `negative → no electron escapes, whatever the intensity`,
            `stopping voltage V₀ = KE/e = ${fmt(Math.max(0, pe.KE), 2)} V`,
          ],
          result: pe.ejects ? `KE_max = ${fmt(pe.KE, 2)} eV  •  V₀ = ${fmt(pe.KE, 2)} V` : `no emission — need f > ${fmt(pe.f0THz, 0)} THz`,
          note: "Einstein's Nobel insight: light arrives in packets. Intensity changes how many electrons, never how fast.",
        })} />}
      >
        <Slider label="Light frequency" unit="THz" min={300} max={2000} step={10} value={f} onChange={(x) => setSim("pe_f", x)} />
        <Slider label="Intensity" unit="%" min={10} max={100} step={5} value={I} onChange={(x) => setSim("pe_I", x)} />
        <div className="grid grid-cols-4 gap-1">
          {METALS.map(([n, , c], i) => (
            <button key={n} onClick={() => setSim("pe_metal", i)}
              className={`rounded border px-1 py-1.5 font-mono text-[8px] uppercase tracking-wider transition-colors ${i === mi ? "text-[#ff5ca8]" : "text-[#5a6d94] hover:text-[#a9bde2]"}`}
              style={{ borderColor: i === mi ? c : "rgba(96,145,255,0.14)" }}>
              {n}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Photon E = hf" value={fmt(pe.Eev, 2)} unit="eV" accent="#ff5ca8" />
          <Stat label="Work fn φ" value={fmt(phi, 2)} unit="eV" />
          <Stat label="KE max" value={pe.ejects ? fmt(pe.KE, 2) : "0"} unit="eV" accent="#39f0c3" />
          <Stat label="Threshold f₀" value={fmt(pe.f0THz, 0)} unit="THz" accent="#ffb454" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Fission / E=mc² ================= */
function FissionCanvas() {
  const phase = useRef(0);
  const run = useStore((s) => Number(s.sim.fs_run));
  useEffect(() => { phase.current = 0; }, [run]);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const st = useStore.getState();
    if (!st.paused) phase.current = (phase.current + dt * 0.32) % 1;
    const p = phase.current;
    const grams = Number(st.sim.fs_g);
    ctx.clearRect(0, 0, w, h);
    const cx = w * 0.56; const cy = h * 0.46;

    // nucleus
    const wobble = p > 0.42 && p < 0.5 ? Math.sin(p * 220) * 6 : 0;
    const split = clamp((p - 0.5) / 0.12, 0, 1);
    if (split <= 0) {
      ctx.save();
      ctx.shadowColor = "rgba(255,92,168,0.8)";
      ctx.shadowBlur = 22;
      ctx.fillStyle = "#ff5ca8";
      ctx.beginPath(); ctx.arc(cx + wobble, cy, 30, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // nucleons texture
      ctx.fillStyle = "rgba(255,208,138,0.8)";
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4;
        ctx.beginPath(); ctx.arc(cx + wobble + Math.cos(a) * 15, cy + Math.sin(a) * 13, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#e9f1ff";
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("²³⁵U", cx + wobble, cy + 3);
    } else {
      const d = split * 120;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.shadowColor = "rgba(255,208,138,0.9)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = s < 0 ? "#ffd08a" : "#9beaff";
        ctx.beginPath(); ctx.arc(cx + s * d, cy + s * d * 0.24, 17, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // secondary neutrons
      const nd = split * 190;
      ctx.fillStyle = "#39f0c3";
      for (let i = 0; i < 3; i++) {
        const a = -0.6 + i * 0.9;
        ctx.beginPath(); ctx.arc(cx + Math.cos(a) * nd, cy + Math.sin(a) * nd * 0.8, 4, 0, Math.PI * 2); ctx.fill();
      }
      if (split < 0.4) {
        ctx.save();
        ctx.globalAlpha = 1 - split / 0.4;
        ctx.strokeStyle = "#fff2c0";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, 30 + split * 260, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#39f0c3";
      ctx.font = "600 11px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("2–3 neutrons out → chain reaction", cx, cy + 80);
    }

    // incoming neutron
    if (p < 0.42) {
      const nx = w * 0.14 + (p / 0.42) * (cx - 30 - w * 0.14);
      ctx.save();
      ctx.shadowColor = "rgba(57,240,195,0.9)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#39f0c3";
      ctx.beginPath(); ctx.arc(nx, cy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#8fa3c8";
      ctx.font = "500 10px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("slow neutron", nx, cy - 16);
    }

    // energy ledger
    const fe = fissionEnergy(grams);
    ctx.textAlign = "left";
    ctx.fillStyle = "#e9f1ff";
    ctx.font = "700 13px 'IBM Plex Mono', monospace";
    ctx.fillText(`${grams} g of ²³⁵U  →  ${fe.EJ < 1e6 ? fmt(fe.EJ, 0) + " J" : fe.EJ.toExponential(2) + " J"}`, 24, 26);
    ctx.fillStyle = "#ffb454";
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.fillText(`= ${fmt(fe.kWh, 0)} kWh  ≈  ${fmt(fe.tnt, 2)} t TNT`, 24, 46);
    ctx.fillStyle = "#5a6d94";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText("mass defect per fission ≈ 0.094% → E = Δm·c²", 24, h - 16);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function FissionUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const bump = useStore((s) => s.bump);
  const openEq = useStore((s) => s.openEq);
  const grams = Number(sim.fs_g);
  const fe = fissionEnergy(grams);
  const dmc2 = grams * 0.00094; // grams converted to energy
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><FissionCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Reactor Controls" color={META.color}
        footer={
          <>
            <button onClick={() => bump("fs_run")} className="pv-btn-primary flex-1 !py-2 !text-[10px]">Fire neutron</button>
            <EqButton onClick={() => openEq({
              title: "Mass–Energy Equivalence",
              formula: "E = Δm·c²     ~200 MeV per fission",
              vars: [["sample", `${grams} g ²³⁵U`], ["Δm/m", "≈ 0.094 %"], ["c", "2.998 × 10⁸ m/s"]],
              steps: [
                `nuclei = ${grams}/235 × 6.022×10²³ = ${((grams / 235) * 6.022e23).toExponential(2)}`,
                `Δm = ${grams} g × 0.00094 = ${fmt(dmc2, 4)} g = ${(dmc2 / 1000).toExponential(2)} kg`,
                `E = Δm·c² = ${(dmc2 / 1000).toExponential(2)} × (2.998×10⁸)² = ${fe.EJ.toExponential(2)} J`,
              ],
              result: `E = ${fe.EJ.toExponential(2)} J  ≈  ${fmt(fe.kWh, 0)} kWh  ≈  ${fmt(fe.tnt, 2)} t TNT`,
              note: "One paperclip of uranium, fully fissioned, releases the energy of burning ~2 700 tonnes of coal.",
            })} />
          </>
        }
      >
        <Slider label="Sample mass" unit="g" min={0.1} max={100} step={0.1} value={grams} onChange={(x) => setSim("fs_g", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Energy" value={fe.EJ < 1e6 ? fmt(fe.EJ, 0) : fe.EJ.toExponential(1)} unit="J" accent="#ff5ca8" />
          <Stat label="In kWh" value={fmt(fe.kWh, 0)} unit="kWh" accent="#ffb454" />
          <Stat label="TNT equiv." value={fmt(fe.tnt, 2)} unit="t" accent="#ff7b6b" />
          <Stat label="Mass lost" value={fmt(dmc2, 4)} unit="g" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Each split releases 2–3 neutrons that can split more nuclei — the chain reaction. Simplified educational model.</p>
      </ControlPanel>
    </>
  );
}

export default function ModernWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "dilation" && <DilationUI />}
      {exp === "photoelectric" && <PhotoelectricUI />}
      {exp === "fission" && <FissionUI />}
    </div>
  );
}
