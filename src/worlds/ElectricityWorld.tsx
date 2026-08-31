import { useEffect, useMemo, useRef, useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceDot } from "recharts";
import { Plus, Minus, Trash2 } from "lucide-react";
import { useStore, WORLDS, EqPayload } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, Btn, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { Charge, eFieldAt, traceFieldLines, ohm, bWire, K_E, MU0, fmt, clamp } from "../physics";
import { sfx } from "../sfx";

const META = WORLDS.find((w) => w.id === "electricity")!;
const PXM = 110; // pixels per meter for field readouts

/* ================= Electric Field ================= */
function FieldCanvas() {
  const [charges, setCharges] = useState<Charge[]>([
    { x: 0.34, y: 0.42, q: 3 },
    { x: 0.66, y: 0.58, q: -3 },
  ]);
  const chargesRef = useRef(charges);
  chargesRef.current = charges;
  const drag = useRef<number | null>(null);
  const cursor = useRef({ x: 0, y: 0, inside: false });
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const add = (e: Event) => {
      const qv = (e as CustomEvent).detail as number;
      setCharges((prev) => (prev.length >= 6 ? prev : [...prev, { x: 0.2 + Math.random() * 0.6, y: 0.25 + Math.random() * 0.5, q: qv }]));
    };
    const clear = () => setCharges([]);
    window.addEventListener("pv-add-charge", add);
    window.addEventListener("pv-clear-charges", clear);
    return () => {
      window.removeEventListener("pv-add-charge", add);
      window.removeEventListener("pv-clear-charges", clear);
    };
  }, []);

  const ref = useCanvasLoop((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const ch = chargesRef.current.map((c) => ({ x: c.x * w, y: c.y * h, q: c.q }));

    // traced field lines
    ctx.lineWidth = 1.1;
    for (const line of traceFieldLines(ch, w, h)) {
      ctx.strokeStyle = "rgba(83,232,255,0.32)";
      ctx.beginPath();
      ctx.moveTo(line[0], line[1]);
      for (let i = 2; i < line.length; i += 2) ctx.lineTo(line[i], line[i + 1]);
      ctx.stroke();
    }

    // vector grid
    const step = 38;
    for (let x = step / 2; x < w; x += step) {
      for (let y = step / 2; y < h; y += step) {
        let near = false;
        for (const c of ch) if (Math.hypot(x - c.x, y - c.y) < 30) { near = true; break; }
        if (near) continue;
        const E = eFieldAt(ch, x, y);
        if (E.mag < 1e-3) continue;
        const rel = E.mag / 2.4e6;
        const len = 5 + 12 * clamp(Math.pow(rel, 0.22), 0, 1.5);
        const dx = E.Ex / E.mag; const dy = E.Ey / E.mag;
        const t = clamp(Math.log10(rel * 12 + 1) / 2.6, 0, 1);
        ctx.strokeStyle = t > 0.66 ? "rgba(255,122,156,0.85)" : t > 0.33 ? "rgba(255,180,84,0.8)" : "rgba(83,232,255,0.6)";
        ctx.beginPath();
        ctx.moveTo(x - dx * len * 0.5, y - dy * len * 0.5);
        ctx.lineTo(x + dx * len * 0.5, y + dy * len * 0.5);
        ctx.stroke();
        const ax = x + dx * len * 0.5; const ay = y + dy * len * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - dx * 4 - dy * 2.6, ay - dy * 4 + dx * 2.6);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - dx * 4 + dy * 2.6, ay - dy * 4 - dx * 2.6);
        ctx.stroke();
      }
    }

    // charges
    for (const c of ch) {
      const pos = c.q > 0;
      ctx.save();
      ctx.shadowColor = pos ? "rgba(255,180,84,0.9)" : "rgba(83,232,255,0.9)";
      ctx.shadowBlur = 16;
      ctx.fillStyle = pos ? "#ffb454" : "#53e8ff";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#071018";
      ctx.font = "700 15px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(pos ? "+" : "−", c.x, c.y + 0.5);
      ctx.fillStyle = "rgba(233,241,255,0.65)";
      ctx.font = "500 9px 'IBM Plex Mono', monospace";
      ctx.fillText(`${Math.abs(c.q)} µC`, c.x, c.y + 24);
    }

    // real N/C readout under cursor
    if (cursor.current.inside && readout.current) {
      const mCh = chargesRef.current.map((c) => ({ x: (c.x * w) / PXM, y: (c.y * h) / PXM, q: c.q * 1e-6 }));
      const E = eFieldAt(mCh, cursor.current.x / PXM, cursor.current.y / PXM);
      readout.current.textContent = `|E| @ cursor = ${fmt(E.mag)} N/C`;
      ctx.strokeStyle = "rgba(233,241,255,0.35)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cursor.current.x, cursor.current.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  });

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={ref}
        className="block h-full w-full touch-none"
        onPointerDown={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - r.left; const py = e.clientY - r.top;
          let best = -1; let bd = 26;
          chargesRef.current.forEach((c, i) => {
            const d = Math.hypot(c.x * r.width - px, c.y * r.height - py);
            if (d < bd) { bd = d; best = i; }
          });
          if (best >= 0) { drag.current = best; e.currentTarget.setPointerCapture(e.pointerId); }
        }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = e.clientX - r.left; const py = e.clientY - r.top;
          cursor.current = { x: px, y: py, inside: true };
          if (drag.current !== null) {
            const i = drag.current;
            setCharges((prev) => prev.map((c, j) => (j === i ? { ...c, x: clamp(px / r.width, 0.04, 0.96), y: clamp(py / r.height, 0.06, 0.94) } : c)));
          }
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => { cursor.current.inside = false; drag.current = null; }}
      />
      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-[rgba(96,145,255,0.16)] bg-[rgba(7,11,22,0.75)] px-2.5 py-1.5 backdrop-blur-md">
        <span ref={readout} className="num text-[11px] text-[#53e8ff]">|E| @ cursor = — N/C</span>
      </div>
      <div className="pointer-events-none absolute bottom-2.5 left-3 font-mono text-[9px] uppercase tracking-[0.18em] text-[#5a6d94]">
        Drag charges • E = kQ/r² • {PXM} px = 1 m
      </div>
    </div>
  );
}

function FieldUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const q = Number(sim.ef_q ?? 3);
  const E1m = K_E * q * 1e-6;
  const eq = (): EqPayload => ({
    title: "Coulomb Electric Field",
    formula: "E = kQ / r²",
    vars: [["k", "8.988 × 10⁹ N·m²/C²"], ["Q", `${q} µC`], ["r", "1 m (example)"]],
    steps: [
      `E = (8.988×10⁹ × ${q}×10⁻⁶) / 1²`,
      `E = ${fmt(E1m)} N/C at 1 m`,
      `at 2 m → E/4 = ${fmt(E1m / 4)} N/C (inverse square)`,
    ],
    result: `|E| = ${fmt(E1m)} N/C at 1 m from a ${q} µC charge`,
    note: "Superposition: the total field is the vector sum over all charges. Lines begin on + and end on −.",
  });
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><FieldCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Field Controls" color={META.color}
        footer={<EqButton onClick={() => openEq(eq())} />}
      >
        <Slider label="New charge magnitude" unit="µC" min={1} max={6} step={0.5} value={q} onChange={(v) => setSim("ef_q", v)} />
        <div className="grid grid-cols-2 gap-2">
          <Btn variant="ghost" className="!border-[rgba(255,180,84,0.35)] !py-2 !text-[10px] !text-[#ffb454]" onClick={() => { window.dispatchEvent(new CustomEvent("pv-add-charge", { detail: q })); sfx.tick(); }}><Plus size={12} /> Add +</Btn>
          <Btn variant="ghost" className="!py-2 !text-[10px]" onClick={() => { window.dispatchEvent(new CustomEvent("pv-add-charge", { detail: -q })); sfx.tick(); }}><Minus size={12} /> Add −</Btn>
        </div>
        <Btn variant="ghost" className="w-full !border-[rgba(255,122,156,0.3)] !py-2 !text-[10px] !text-[#ff7a9c]" onClick={() => { window.dispatchEvent(new CustomEvent("pv-clear-charges")); sfx.tick(); }}>
          <Trash2 size={12} /> Clear charges
        </Btn>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Max 6 charges. Move your cursor over the canvas to measure the real field strength in N/C.</p>
      </ControlPanel>
    </>
  );
}

/* ================= Ohm's Law ================= */
function OhmCanvas({ I, R }: { I: number; R: number }) {
  const phase = useRef(0);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    ctx.clearRect(0, 0, w, h);
    const mx = 56; const my = 46;
    const x0 = mx; const y0 = my; const x1 = w - mx; const y1 = h - my;
    const speed = I > 0.001 ? clamp(I * 26, 4, 300) : 0;
    if (!useStore.getState().paused) phase.current = (phase.current + speed * dt) % 100000;

    ctx.save();
    ctx.strokeStyle = "rgba(83,232,255,0.16)";
    ctx.lineWidth = 7;
    ctx.shadowColor = "rgba(83,232,255,0.8)";
    ctx.shadowBlur = 14 * clamp(I / 4, 0, 1);
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    ctx.strokeStyle = "#2a3d66";
    ctx.lineWidth = 4;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

    // battery
    const bx = x0; const by = (y0 + y1) / 2;
    ctx.fillStyle = "#0a1122";
    ctx.fillRect(bx - 7, by - 26, 14, 52);
    ctx.strokeStyle = "#ffb454"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(bx, by - 20); ctx.lineTo(bx, by - 6); ctx.stroke();
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(bx, by + 4); ctx.lineTo(bx, by + 18); ctx.stroke();
    ctx.fillStyle = "#ffb454";
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("+", bx, by - 30);
    ctx.fillText("−", bx, by + 40);
    ctx.fillStyle = "#8fa3c8";
    ctx.fillText("V", bx - 24, by + 4);

    // resistor
    const rx = x1; const ry = (y0 + y1) / 2;
    ctx.fillStyle = "#0a1122";
    ctx.fillRect(rx - 14, ry - 30, 28, 60);
    ctx.strokeStyle = "#53e8ff"; ctx.lineWidth = 2;
    ctx.strokeRect(rx - 12, ry - 26, 24, 52);
    const P = I * I * R;
    ctx.save();
    ctx.globalAlpha = clamp(P / 40, 0, 0.55);
    ctx.fillStyle = "#ff7a4d";
    ctx.fillRect(rx - 12, ry - 26, 24, 52);
    ctx.restore();
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.fillText("R", rx + 26, ry + 4);

    // electrons
    const perim = 2 * ((x1 - x0) + (y1 - y0));
    const n = 26;
    for (let i = 0; i < n; i++) {
      let d = ((i / n) * perim + phase.current) % perim;
      let px = 0; let py = 0;
      const wseg = x1 - x0; const hseg = y1 - y0;
      if (d < wseg) { px = x0 + d; py = y0; }
      else if ((d -= wseg) < hseg) { px = x1; py = y0 + d; }
      else if ((d -= hseg) < wseg) { px = x1 - d; py = y1; }
      else { d -= wseg; px = x0; py = y1 - d; }
      ctx.fillStyle = "rgba(83,232,255,0.95)";
      ctx.beginPath();
      ctx.arc(px, py, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // conventional-current arrows
    ctx.fillStyle = "rgba(255,180,84,0.9)";
    const arrow = (ax: number, ay: number, angle: number) => {
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-4, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    arrow((x0 + x1) / 2, y0, 0);
    arrow(x1, (y0 + y1) / 2 + 44, Math.PI / 2);
    arrow((x0 + x1) / 2, y1, Math.PI);
    arrow(x0, (y0 + y1) / 2 - 44, -Math.PI / 2);

    ctx.fillStyle = "#e9f1ff";
    ctx.font = "600 13px 'IBM Plex Mono', monospace";
    ctx.fillText(`I = ${fmt(I, 2)} A`, (x0 + x1) / 2, (y0 + y1) / 2 - 4);
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 11px 'IBM Plex Mono', monospace";
    ctx.fillText("electron drift ∝ I", (x0 + x1) / 2, (y0 + y1) / 2 + 16);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function OhmUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const V = Number(sim.ohm_V); const R = Number(sim.ohm_R);
  const o = ohm(V, R);
  const ivData = useMemo(() => Array.from({ length: 25 }, (_, i) => ({ V: i, I: +(i / R).toFixed(3) })), [R]);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full">
          <div className="relative h-full w-full">
            <OhmCanvas I={o.I} R={R} />
            <div className="absolute bottom-3 right-3 h-[38%] w-[42%] max-w-[16rem] rounded-lg border border-[rgba(96,145,255,0.14)] bg-[rgba(7,11,22,0.8)] p-2 backdrop-blur-md">
              <div className="label-xs !text-[8px]">I–V characteristic (live)</div>
              <div className="h-[calc(100%-14px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ivData} margin={{ top: 6, right: 8, bottom: 0, left: -14 }}>
                    <XAxis dataKey="V" tick={{ fontSize: 8, fill: "#5a6d94" }} tickLine={false} axisLine={{ stroke: "#1b2a49" }} unit="V" />
                    <YAxis tick={{ fontSize: 8, fill: "#5a6d94" }} tickLine={false} axisLine={false} width={34} unit="A" />
                    <Tooltip contentStyle={{ background: "#0a1122", border: "1px solid #1b2a49", borderRadius: 8, fontSize: 10 }} />
                    <Line type="monotone" dataKey="I" stroke="#53e8ff" strokeWidth={1.6} dot={false} isAnimationActive={false} />
                    <ReferenceDot x={V} y={+o.I.toFixed(3)} r={4} fill="#ffb454" stroke="none" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CanvasFrame>
      </div>
      <ControlPanel
        title="Circuit Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Ohm's Law",
          formula: "V = I·R     P = V·I = I²R",
          vars: [["V", `${V} V`], ["R", `${R} Ω`]],
          steps: [
            `I = V / R = ${V} / ${R} = ${fmt(o.I, 3)} A`,
            `P = V × I = ${V} × ${fmt(o.I, 3)} = ${fmt(o.P, 2)} W`,
          ],
          result: `I = ${fmt(o.I, 3)} A   •   P = ${fmt(o.P, 2)} W`,
          note: "Ideal resistor; electron drift speed in the wire is drawn proportional to I.",
        })} />}
      >
        <Slider label="Voltage" unit="V" min={0} max={24} step={0.5} value={V} onChange={(v) => setSim("ohm_V", v)} />
        <Slider label="Resistance" unit="Ω" min={1} max={100} step={1} value={R} onChange={(v) => setSim("ohm_R", v)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Current" value={fmt(o.I, 2)} unit="A" accent="#53e8ff" />
          <Stat label="Power" value={fmt(o.P, 1)} unit="W" accent="#ffb454" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Magnetic field ================= */
function MagnetCanvas({ I, rCm }: { I: number; rCm: number }) {
  const ref = useCanvasLoop((ctx, w, h, t) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2; const cy = h / 2;
    const aI = Math.abs(I);
    const spacing = clamp(150 / (aI + 3), 14, 46);
    const dir = I >= 0 ? 1 : -1;

    for (let i = 1; i <= 8; i++) {
      const rr = i * spacing;
      if (rr > Math.min(w, h) * 0.62) break;
      const alpha = clamp(0.55 - i * 0.055, 0.1, 0.6) * clamp(aI / 4, 0.25, 1);
      ctx.strokeStyle = `rgba(83,232,255,${alpha})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
      const nA = 6 + i * 2;
      ctx.fillStyle = `rgba(83,232,255,${Math.min(0.9, alpha + 0.25)})`;
      for (let k = 0; k < nA; k++) {
        const a = (k / nA) * Math.PI * 2 + t * 0.25 * dir;
        const ax = cx + Math.cos(a) * rr;
        const ay = cy + Math.sin(a) * rr;
        const tang = a + (Math.PI / 2) * dir;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(tang);
        ctx.beginPath();
        ctx.moveTo(6, 0); ctx.lineTo(-3.5, -3.4); ctx.lineTo(-3.5, 3.4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // probe radius
    const rp = rCm * 3.4;
    ctx.strokeStyle = "rgba(255,180,84,0.85)";
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, rp, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#ffb454";
    ctx.beginPath();
    ctx.arc(cx + rp, cy, 4, 0, Math.PI * 2);
    ctx.fill();

    // wire cross-section
    ctx.save();
    ctx.shadowColor = aI > 0.2 ? "rgba(255,180,84,0.9)" : "transparent";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#1a2440";
    ctx.strokeStyle = "#ffb454";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (I >= 0) {
      ctx.fillStyle = "#ffd08a";
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#ffd08a";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 6); ctx.lineTo(cx + 6, cy + 6);
      ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 6, cy + 6);
      ctx.stroke();
    }
    ctx.fillStyle = "#8fa3c8";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(I >= 0 ? "current ⊙ out of page" : "current ⊗ into page", cx, cy + 38);
    ctx.fillText("right-hand rule: thumb = I, fingers = B", cx, h - 14);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function MagnetUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const I = Number(sim.mag_I); const rCm = Number(sim.mag_r);
  const B = bWire(I, rCm);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full">
          <div className="relative h-full w-full">
            <MagnetCanvas I={I} rCm={rCm} />
            <div className="absolute left-3 top-3 rounded-md border border-[rgba(96,145,255,0.16)] bg-[rgba(7,11,22,0.78)] px-2.5 py-1.5 backdrop-blur-md">
              <span className="num text-[11px] text-[#ffb454]">B({fmt(rCm, 1)} cm) = {fmt(B * 1e6, 2)} µT</span>
            </div>
          </div>
        </CanvasFrame>
      </div>
      <ControlPanel
        title="Current Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Field of a Straight Wire",
          formula: "B = μ₀I / (2πr)",
          vars: [["μ₀", "1.257 × 10⁻⁶ T·m/A"], ["I", `${I} A`], ["r", `${rCm} cm = ${fmt(rCm / 100, 3)} m`]],
          steps: [
            `B = (1.257×10⁻⁶ × ${I}) / (2π × ${fmt(rCm / 100, 3)})`,
            `B = ${fmt(B, 3)} T`,
          ],
          result: `B = ${fmt(B * 1e6, 2)} µT`,
          note: "Flip the current sign — the right-hand rule flips every field arrow.",
        })} />}
      >
        <Slider label="Current (sign = direction)" unit="A" min={-10} max={10} step={0.5} value={I} onChange={(v) => setSim("mag_I", v)} />
        <Slider label="Probe distance" unit="cm" min={1} max={20} step={0.5} value={rCm} onChange={(v) => setSim("mag_r", v)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Field B" value={fmt(B * 1e6, 2)} unit="µT" accent="#53e8ff" />
          <Stat label="μ₀I/2π" value={fmt(((MU0 * I) / (2 * Math.PI)) * 1e6, 1)} unit="µT·m" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Field lines are concentric circles; density increases with current. Arrows follow the right-hand rule.</p>
      </ControlPanel>
    </>
  );
}

export default function ElectricityWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "field" && <FieldUI />}
      {exp === "ohm" && <OhmUI />}
      {exp === "magnet" && <MagnetUI />}
    </div>
  );
}
