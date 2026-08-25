import { useEffect, useMemo, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { useStore, WORLDS, IS_COARSE } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, Seg, Btn, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { slitPattern, tunnelProbability, fmt, clamp } from "../physics";

const META = WORLDS.find((w) => w.id === "quantum")!;

/* ================= Double slit ================= */
interface QParticle { slitY: number; ty: number; t: number }
interface Hit { y: number; j: number }

function DoubleSlitCanvas() {
  const lambda = useStore((s) => Number(s.sim.ds_l));
  const d = useStore((s) => Number(s.sim.ds_d));
  const wave = useStore((s) => Boolean(s.sim.ds_wave));
  const run = useStore((s) => Number(s.sim.ds_run));

  const pattern = useMemo(() => slitPattern(lambda, d), [lambda, d]);
  const spanM = useMemo(() => Math.max(0.0004, ((lambda * 1e-9) * 1.2) / (d * 1e-6) * 6), [lambda, d]);

  const hits = useRef<Hit[]>([]);
  const parts = useRef<QParticle[]>([]);
  const acc = useRef(0);
  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => { hits.current = []; parts.current = []; acc.current = 0; }, [run, pattern]);

  const ref = useCanvasLoop((ctx, w, h, t, dt) => {
    ctx.clearRect(0, 0, w, h);
    const cy = h / 2;
    const bx = w * 0.3;
    const sx = w * 0.86;
    const scaleY = (h * 0.44) / spanM;
    const slitSep = clamp(d * 26, 26, h * 0.3);
    const paused = useStore.getState().paused;

    // source
    const pulse = 6 + Math.sin(t * 5) * 1.6;
    ctx.save();
    ctx.shadowColor = "rgba(207,139,255,0.9)";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#cf8bff";
    ctx.beginPath(); ctx.arc(w * 0.07, cy, pulse, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(233,241,255,0.55)";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("particle source", w * 0.07, cy + 26);

    // barrier with two slits
    ctx.fillStyle = "rgba(30,44,80,0.95)";
    ctx.strokeStyle = "rgba(122,184,255,0.4)";
    const gap = 9;
    const seg = (y0: number, y1: number) => {
      ctx.fillRect(bx - 5, y0, 10, y1 - y0);
      ctx.strokeRect(bx - 5, y0, 10, y1 - y0);
    };
    seg(0, cy - slitSep / 2 - gap);
    seg(cy - slitSep / 2 + gap, cy + slitSep / 2 - gap);
    seg(cy + slitSep / 2 + gap, h);
    ctx.fillStyle = "rgba(233,241,255,0.5)";
    ctx.fillText("barrier", bx, 16);

    // screen
    ctx.fillStyle = "rgba(20,31,58,0.9)";
    ctx.fillRect(sx - 3, cy - h * 0.46, 26, h * 0.92);
    ctx.fillStyle = "rgba(233,241,255,0.5)";
    ctx.fillText("detector", sx + 10, 16);

    if (wave) {
      // interference intensity on screen + wavefront arcs
      for (let y = cy - h * 0.45; y < cy + h * 0.45; y += 2) {
        const xm = (y - cy) / scaleY;
        const beta = (Math.PI * (d * 1e-6) * xm) / (lambda * 1e-9 * 1.2);
        const alpha = (Math.PI * (d * 1e-6) * xm) / (4 * lambda * 1e-9 * 1.2);
        const env = Math.abs(alpha) < 1e-6 ? 1 : Math.sin(alpha) / alpha;
        const I = Math.cos(beta) ** 2 * env * env;
        ctx.fillStyle = `rgba(207,139,255,${0.08 + 0.85 * I})`;
        ctx.fillRect(sx - 1, y, 22, 2);
        ctx.fillStyle = `rgba(140,90,220,${0.16 * I})`;
        ctx.fillRect(bx + 6, y, sx - bx - 8, 2);
      }
      // expanding arcs from slits
      ctx.strokeStyle = "rgba(207,139,255,0.35)";
      ctx.lineWidth = 1.2;
      const sp = 46;
      for (const sy of [cy - slitSep / 2, cy + slitSep / 2]) {
        for (let i = 0; i < 6; i++) {
          const r = ((t * 60 + i * sp) % (sp * 6));
          if (r < 6) continue;
          ctx.beginPath();
          ctx.arc(bx, sy, r, -Math.PI / 2.4, Math.PI / 2.4);
          ctx.stroke();
        }
      }
    } else {
      // particle mode: spawn
      if (!paused && hits.current.length < 3600) {
        acc.current += dt * (IS_COARSE ? 34 : 75);
        while (acc.current > 1 && parts.current.length < 30) {
          acc.current -= 1;
          const slitY = cy + (Math.random() < 0.5 ? -1 : 1) * slitSep / 2;
          parts.current.push({ slitY, ty: cy + pattern.sample() * scaleY, t: 0 });
        }
      }
      // advance + draw
      const next: QParticle[] = [];
      for (const p of parts.current) {
        if (!paused) p.t += dt * 1.15;
        if (p.t >= 1) {
          hits.current.push({ y: p.ty, j: (Math.random() - 0.5) * 18 });
          continue;
        }
        let px: number; let py: number;
        if (p.t < 0.42) {
          const k = p.t / 0.42;
          px = w * 0.07 + (bx - w * 0.07) * k;
          py = cy + (p.slitY - cy) * k;
        } else {
          const k = (p.t - 0.42) / 0.58;
          px = bx + (sx - bx) * k;
          py = p.slitY + (p.ty - p.slitY) * k;
        }
        ctx.fillStyle = "rgba(207,139,255,0.95)";
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
        next.push(p);
      }
      parts.current = next;
      // accumulated hits = the emerging pattern
      ctx.fillStyle = "rgba(57,240,195,0.85)";
      for (const hp of hits.current) {
        ctx.fillRect(sx + hp.j, hp.y, 2, 2);
      }
      if (countRef.current) countRef.current.textContent = `${hits.current.length} detections`;
    }
  });

  return (
    <div className="relative h-full w-full">
      <canvas ref={ref} className="block h-full w-full" />
      {!wave ? (
        <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-[rgba(96,145,255,0.16)] bg-[rgba(7,11,22,0.78)] px-2.5 py-1.5 backdrop-blur-md">
          <span ref={countRef} className="num text-[11px] text-[#39f0c3]">0 detections</span>
        </div>
      ) : null}
      <div className="pointer-events-none absolute bottom-2.5 left-3 font-mono text-[9px] uppercase tracking-[0.16em] text-[#5a6d94]">
        {wave ? "wave view — probability amplitude |ψ|²" : "particle view — each dot is one detection; the pattern emerges"}
      </div>
    </div>
  );
}

function DoubleSlitUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const bump = useStore((s) => s.bump);
  const openEq = useStore((s) => s.openEq);
  const lambda = Number(sim.ds_l); const d = Number(sim.ds_d); const wave = Boolean(sim.ds_wave);
  const fringe = ((lambda * 1e-9) * 1.2) / (d * 1e-6) * 1000; // mm
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><DoubleSlitCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Slit Controls" color={META.color}
        footer={
          <>
            <Btn variant="ghost" className="flex-1 !py-2 !text-[10px]" onClick={() => bump("ds_run")}><RotateCcw size={12} /> Clear pattern</Btn>
            <EqButton onClick={() => openEq({
              title: "Double-Slit Interference",
              formula: "I(θ) ∝ cos²(πd·sinθ/λ)    Δy = λL/d",
              vars: [["λ", `${lambda} nm`], ["d", `${d} µm`], ["L", "1.2 m"]],
              steps: [
                `Δy = (${lambda}×10⁻⁹ × 1.2) / (${d}×10⁻⁶)`,
                `Δy = ${fmt(fringe, 3)} mm between bright fringes`,
                `each particle lands where |ψ₁ + ψ₂|² is large`,
              ],
              result: `fringe spacing Δy = ${fmt(fringe, 2)} mm`,
              note: "Send particles one at a time — the interference pattern still builds up. That is the quantum mystery.",
            })} />
          </>
        }
      >
        <Seg options={[{ id: "p", label: "Particles" }, { id: "w", label: "Waves" }]} value={wave ? "w" : "p"} onChange={(v) => setSim("ds_wave", v === "w")} />
        <Slider label="Wavelength λ" unit="nm" min={300} max={800} step={10} value={lambda} onChange={(x) => setSim("ds_l", x)} />
        <Slider label="Slit separation d" unit="µm" min={0.5} max={10} step={0.1} value={d} onChange={(x) => setSim("ds_d", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Fringe spacing" value={fmt(fringe, 2)} unit="mm" accent="#cf8bff" />
          <Stat label="L (screen)" value="1.2" unit="m" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Detection positions are sampled from the real quantum probability distribution cos²(πd·x/λL).</p>
      </ControlPanel>
    </>
  );
}

/* ================= Tunneling ================= */
interface Packet { x: number; vx: number; amp: number; color: string; split?: boolean }

function TunnelingCanvas() {
  const E = useStore((s) => Number(s.sim.tn_E));
  const V0 = useStore((s) => Number(s.sim.tn_V0));
  const a = useStore((s) => Number(s.sim.tn_a));
  const run = useStore((s) => Number(s.sim.tn_run));
  const { T } = tunnelProbability(E, V0, a);

  const packets = useRef<Packet[]>([]);
  useEffect(() => { packets.current = []; }, [run, E, V0, a]);

  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    ctx.clearRect(0, 0, w, h);
    const y0 = h * 0.7;
    const bx = w * 0.52;
    const bw = clamp(a * 64, 22, 180);
    const bh = clamp(V0 * h * 0.14, 20, h * 0.5);
    const Eh = clamp(E * h * 0.14, 10, h * 0.5);
    const paused = useStore.getState().paused;

    // barrier
    ctx.fillStyle = "rgba(255,180,84,0.16)";
    ctx.fillRect(bx, y0 - bh, bw, bh);
    ctx.strokeStyle = "rgba(255,180,84,0.75)";
    ctx.lineWidth = 1.6;
    ctx.strokeRect(bx, y0 - bh, bw, bh);
    ctx.fillStyle = "#ffb454";
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(`V₀ = ${V0} eV`, bx + bw / 2, y0 - bh - 8);
    ctx.fillText(`width a = ${a} nm`, bx + bw / 2, y0 + 18);

    // baseline + energy line
    ctx.strokeStyle = "rgba(233,241,255,0.35)";
    ctx.beginPath(); ctx.moveTo(14, y0); ctx.lineTo(w - 14, y0); ctx.stroke();
    ctx.strokeStyle = "rgba(57,240,195,0.6)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(14, y0 - Eh); ctx.lineTo(w - 14, y0 - Eh); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#39f0c3";
    ctx.textAlign = "left";
    ctx.fillText(`E = ${E} eV`, 18, y0 - Eh - 7);

    // packets
    if (!paused) {
      if (packets.current.length === 0) packets.current.push({ x: w * 0.1, vx: 135, amp: 1, color: "#cf8bff" });
      const next: Packet[] = [];
      for (const p of packets.current) {
        p.x += p.vx * dt;
        if (!p.split && p.vx > 0 && p.x >= bx - 8) {
          p.split = true;
          next.push({ x: bx - 8, vx: -135 * (0.55 + 0.45 * (1 - T)), amp: Math.sqrt(clamp(1 - T, 0, 1)), color: "#ff7a9c", split: true });
          next.push({ x: bx + bw + 8, vx: 135, amp: Math.sqrt(T), color: "#39f0c3", split: true });
          continue;
        }
        if (p.x > -80 && p.x < w + 80 && p.amp > 0.02) next.push(p);
      }
      packets.current = next;
    }
    for (const p of packets.current) {
      if (p.amp < 0.02) continue;
      const sigma = 24;
      const H = p.amp * h * 0.17;
      ctx.beginPath();
      ctx.moveTo(p.x - sigma * 3, y0);
      for (let x = -sigma * 3; x <= sigma * 3; x += 3) {
        ctx.lineTo(p.x + x, y0 - H * Math.exp(-(x * x) / (2 * sigma * sigma)));
      }
      ctx.closePath();
      ctx.fillStyle = p.color + "33";
      ctx.fill();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = -sigma * 3; x <= sigma * 3; x += 3) {
        const y = y0 - H * Math.exp(-(x * x) / (2 * sigma * sigma));
        if (x === -sigma * 3) ctx.moveTo(p.x + x, y);
        else ctx.lineTo(p.x + x, y);
      }
      ctx.stroke();
    }
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function TunnelingUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const E = Number(sim.tn_E); const V0 = Number(sim.tn_V0); const a = Number(sim.tn_a);
  const { T, above, kappa } = tunnelProbability(E, V0, a);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full">
          <div className="relative h-full w-full">
            <TunnelingCanvas />
            <div className="absolute left-3 top-3 rounded-md border border-[rgba(96,145,255,0.16)] bg-[rgba(7,11,22,0.78)] px-2.5 py-1.5 backdrop-blur-md">
              <span className="num text-[12px] text-[#39f0c3]">T = {(T * 100) < 0.01 && T > 0 ? T.toExponential(1) : fmt(T * 100, 2)}% tunneling</span>
            </div>
          </div>
        </CanvasFrame>
      </div>
      <ControlPanel
        title="Barrier Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Quantum Tunneling",
          formula: "T ≈ e^(−2κa)    κ = √(2m(V₀−E))/ħ",
          vars: [["E", `${E} eV`], ["V₀", `${V0} eV`], ["a", `${a} nm`], ["m", "electron mass"]],
          steps: above
            ? [`E ≥ V₀ → the particle is above the barrier`, `T = 1 (classically allowed, no tunneling needed)`]
            : [
              `κ = √(2 × 9.109×10⁻³¹ × ${fmt(V0 - E, 2)} × 1.602×10⁻¹⁹) / 1.055×10⁻³⁴`,
              `κ = ${fmt(kappa / 1e9, 2)} nm⁻¹`,
              `T = e^(−2 × ${fmt(kappa / 1e9, 2)} × ${a}) = ${T < 1e-4 ? T.toExponential(2) : fmt(T, 4)}`,
            ],
          result: `Tunneling probability T = ${fmt(T * 100, 2)} %`,
          note: "Simplified educational model: 1-D rectangular barrier, plane-wave approximation. Real tunneling (STM, alpha decay, fusion) uses this same exponential sensitivity.",
        })} />}
      >
        <Slider label="Particle energy E" unit="eV" min={0.1} max={3} step={0.05} value={E} onChange={(x) => setSim("tn_E", x)} />
        <Slider label="Barrier height V₀" unit="eV" min={0.2} max={3} step={0.05} value={V0} onChange={(x) => setSim("tn_V0", x)} />
        <Slider label="Barrier width a" unit="nm" min={0.2} max={3} step={0.1} value={a} onChange={(x) => setSim("tn_a", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Probability T" value={fmt(T * 100, 2)} unit="%" accent="#39f0c3" />
          <Stat label="Regime" value={above ? "E > V₀" : "E < V₀"} accent={above ? "#ffb454" : "#cf8bff"} />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Green packet = transmitted (√T), rose = reflected. Width and height change T exponentially.</p>
      </ControlPanel>
    </>
  );
}

export default function QuantumWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "doubleslit" && <DoubleSlitUI />}
      {exp === "tunneling" && <TunnelingUI />}
    </div>
  );
}
