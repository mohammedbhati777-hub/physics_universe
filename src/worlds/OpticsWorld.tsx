import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, Seg, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { refract, thinLens, fmt, clamp } from "../physics";

const META = WORLDS.find((w) => w.id === "optics")!;

/* ================= Reflection ================= */
function ReflectionCanvas() {
  const ref = useCanvasLoop((ctx, w, h) => {
    const th = (Number(useStore.getState().sim.rf_th) * Math.PI) / 180;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2; const cy = h * 0.6;
    const tilt = 0; // mirror horizontal; incidence angle does the work
    const nLen = Math.min(h * 0.42, 240);
    const rLen = Math.min(w * 0.4, 330);

    // mirror
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.strokeStyle = "#c8d6f0";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-rLen, 0); ctx.lineTo(rLen, 0); ctx.stroke();
    ctx.strokeStyle = "rgba(200,214,240,0.5)";
    ctx.lineWidth = 1;
    for (let x = -rLen; x <= rLen; x += 14) {
      ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x - 8, 12); ctx.stroke();
    }
    ctx.restore();

    // normal
    ctx.strokeStyle = "rgba(233,241,255,0.4)";
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(cx, cy - nLen); ctx.lineTo(cx, cy + nLen * 0.5); ctx.stroke();
    ctx.setLineDash([]);

    // rays
    const ix = cx - Math.sin(th) * rLen;
    const iy = cy - Math.cos(th) * rLen;
    const rx = cx + Math.sin(th) * rLen;
    const ry = cy - Math.cos(th) * rLen;
    const ray = (x1: number, y1: number, x2: number, y2: number, color: string, glow: string) => {
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
      // arrowhead at midpoint
      const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-4, -4.5); ctx.lineTo(-4, 4.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    ray(ix, iy, cx, cy, "#ffb454", "rgba(255,180,84,0.8)");
    ray(cx, cy, rx, ry, "#53e8ff", "rgba(83,232,255,0.8)");

    // angle arcs
    const arc = (a0: number, a1: number, color: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, 46, a0, a1);
      ctx.stroke();
    };
    arc(-Math.PI / 2 - th, -Math.PI / 2, "rgba(255,180,84,0.9)");
    arc(-Math.PI / 2, -Math.PI / 2 + th, "rgba(83,232,255,0.9)");

    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffb454";
    ctx.fillText(`θᵢ = ${fmt(th * 180 / Math.PI, 0)}°`, cx - Math.sin(th / 2) * 78, cy - Math.cos(th / 2) * 78);
    ctx.fillStyle = "#53e8ff";
    ctx.fillText(`θᵣ = ${fmt(th * 180 / Math.PI, 0)}°`, cx + Math.sin(th / 2) * 78, cy - Math.cos(th / 2) * 78);
    ctx.fillStyle = "rgba(233,241,255,0.55)";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillText("normal", cx + 30, cy - nLen + 12);
    ctx.fillText("incident", ix + 36, iy + 16);
    ctx.fillText("reflected", rx - 40, ry + 16);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function ReflectionUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const th = Number(sim.rf_th);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><ReflectionCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Mirror Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Law of Reflection",
          formula: "θᵢ = θᵣ  (measured from the normal)",
          vars: [["θᵢ", `${th}°`], ["θᵣ", `${th}°`]],
          steps: [
            `incident ray hits at ${th}° from normal`,
            `reflected ray leaves at exactly ${th}° on the opposite side`,
          ],
          result: `θᵢ = θᵣ = ${th}°  — always, for any mirror angle`,
          note: "The angles are measured from the normal, never from the surface.",
        })} />}
      >
        <Slider label="Angle of incidence" unit="deg" min={5} max={85} step={1} value={th} onChange={(x) => setSim("rf_th", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="θ incidence" value={fmt(th, 0)} unit="°" accent="#ffb454" />
          <Stat label="θ reflection" value={fmt(th, 0)} unit="°" accent="#53e8ff" />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">Both angles stay locked together — that equality IS the law of reflection.</p>
      </ControlPanel>
    </>
  );
}

/* ================= Refraction ================= */
function RefractionCanvas() {
  const ref = useCanvasLoop((ctx, w, h) => {
    const n1 = Number(useStore.getState().sim.rr_n1);
    const n2 = Number(useStore.getState().sim.rr_n2);
    const th1 = Number(useStore.getState().sim.rr_th);
    const r = refract(n1, n2, th1);
    ctx.clearRect(0, 0, w, h);
    const cy = h * 0.5;
    const cx = w / 2;
    const L = Math.min(h * 0.42, 250);

    // media
    ctx.fillStyle = `rgba(122,184,255,${clamp((n1 - 1) * 0.14, 0, 0.3)})`;
    ctx.fillRect(0, 0, w, cy);
    ctx.fillStyle = `rgba(83,232,255,${clamp((n2 - 1) * 0.16, 0, 0.38)})`;
    ctx.fillRect(0, cy, w, h - cy);
    ctx.strokeStyle = "rgba(233,241,255,0.5)";
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.fillStyle = "rgba(233,241,255,0.6)";
    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`medium 1 • n₁ = ${n1.toFixed(2)}`, 12, cy - 12);
    ctx.fillText(`medium 2 • n₂ = ${n2.toFixed(2)}`, 12, cy + 22);

    // normal
    ctx.strokeStyle = "rgba(233,241,255,0.35)";
    ctx.setLineDash([5, 6]);
    ctx.beginPath(); ctx.moveTo(cx, cy - L - 20); ctx.lineTo(cx, cy + L + 20); ctx.stroke();
    ctx.setLineDash([]);

    const t1 = (th1 * Math.PI) / 180;
    const ix = cx - Math.sin(t1) * L;
    const iy = cy - Math.cos(t1) * L;
    const ray = (x1: number, y1: number, x2: number, y2: number, color: string, dash = false) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 9;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.3;
      if (dash) ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    };
    ray(ix, iy, cx, cy, "#ffb454");
    // partial reflection always
    ray(cx, cy, cx + Math.sin(t1) * L * 0.7, cy - Math.cos(t1) * L * 0.7, "rgba(255,180,84,0.4)", true);

    if (r.tir) {
      ray(cx, cy, cx + Math.sin(t1) * L, cy - Math.cos(t1) * L, "#ff7a9c");
      ctx.fillStyle = "#ff7a9c";
      ctx.font = "700 13px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("TOTAL INTERNAL REFLECTION", cx, cy + 44);
      const thc = Math.asin(n2 / n1) * 180 / Math.PI;
      ctx.font = "500 11px 'IBM Plex Mono', monospace";
      ctx.fillText(`critical angle θc = ${fmt(thc, 1)}°  —  θ₁ exceeds it`, cx, cy + 62);
    } else {
      const t2 = (r.th2Deg * Math.PI) / 180;
      ray(cx, cy, cx + Math.sin(t2) * L, cy + Math.cos(t2) * L, "#53e8ff");
      // angle arcs
      ctx.strokeStyle = "rgba(255,180,84,0.9)";
      ctx.beginPath(); ctx.arc(cx, cy, 42, -Math.PI / 2 - t1, -Math.PI / 2); ctx.stroke();
      ctx.strokeStyle = "rgba(83,232,255,0.9)";
      ctx.beginPath(); ctx.arc(cx, cy, 42, Math.PI / 2 - t2, Math.PI / 2); ctx.stroke();
      ctx.font = "600 12px 'IBM Plex Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffb454";
      ctx.fillText(`θ₁ = ${fmt(th1, 0)}°`, cx - Math.sin(t1 / 2) * 84, cy - Math.cos(t1 / 2) * 84);
      ctx.fillStyle = "#53e8ff";
      ctx.fillText(`θ₂ = ${fmt(r.th2Deg, 1)}°`, cx + Math.sin(t2 / 2) * 88, cy + Math.cos(t2 / 2) * 88);
    }
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function RefractionUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const n1 = Number(sim.rr_n1); const n2 = Number(sim.rr_n2); const th1 = Number(sim.rr_th);
  const r = refract(n1, n2, th1);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><RefractionCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Refraction Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Snell's Law",
          formula: "n₁ sin θ₁ = n₂ sin θ₂",
          vars: [["n₁", `${n1.toFixed(2)}`], ["n₂", `${n2.toFixed(2)}`], ["θ₁", `${th1}°`]],
          steps: r.tir
            ? [
              `sin θ₂ = (n₁/n₂)·sin θ₁ = ${(n1 / n2).toFixed(3)} × ${fmt(Math.sin((th1 * Math.PI) / 180), 3)} = ${fmt((n1 / n2) * Math.sin((th1 * Math.PI) / 180), 3)}`,
              `sin θ₂ > 1  →  no refracted ray exists`,
              `θc = asin(n₂/n₁) = ${fmt(Math.asin(n2 / n1) * 180 / Math.PI, 1)}°`,
            ]
            : [
              `sin θ₂ = (n₁/n₂)·sin θ₁ = ${(n1 / n2).toFixed(3)} × ${fmt(Math.sin((th1 * Math.PI) / 180), 3)}`,
              `sin θ₂ = ${fmt(Math.sin((r.th2Deg * Math.PI) / 180), 4)}`,
              `θ₂ = asin(${fmt(Math.sin((r.th2Deg * Math.PI) / 180), 4)}) = ${fmt(r.th2Deg, 2)}°`,
            ],
          result: r.tir ? `Total internal reflection — θ₁ > θc = ${fmt(Math.asin(n2 / n1) * 180 / Math.PI, 1)}°` : `θ₂ = ${fmt(r.th2Deg, 2)}°`,
          note: n1 > n2 ? "Dense → thin medium: beyond the critical angle, all light reflects." : "Entering a denser medium bends light toward the normal.",
        })} />}
      >
        <Slider label="n₁ (top medium)" unit="" min={1} max={2.5} step={0.05} value={n1} onChange={(x) => setSim("rr_n1", x)} />
        <div className="flex gap-1">
          {([["Vacuum", 1, "rr_n1"], ["Water", 1.33, "rr_n1"], ["Glass", 1.5, "rr_n1"]] as [string, number, string][]).map(([n, v]) => (
            <button key={n} onClick={() => setSim("rr_n1", v)} className="flex-1 rounded border border-[rgba(96,145,255,0.14)] px-1 py-1 font-mono text-[9px] uppercase tracking-wider text-[#5a6d94] hover:text-[#ffe08a]">{n}</button>
          ))}
        </div>
        <Slider label="n₂ (bottom medium)" unit="" min={1} max={2.5} step={0.05} value={n2} onChange={(x) => setSim("rr_n2", x)} />
        <div className="flex gap-1">
          {([["Air", 1.0], ["Water", 1.33], ["Glass", 1.5], ["Diamond", 2.42]] as [string, number][]).map(([n, v]) => (
            <button key={n} onClick={() => setSim("rr_n2", v)} className="flex-1 rounded border border-[rgba(96,145,255,0.14)] px-1 py-1 font-mono text-[9px] uppercase tracking-wider text-[#5a6d94] hover:text-[#ffe08a]">{n}</button>
          ))}
        </div>
        <Slider label="Incidence angle θ₁" unit="deg" min={5} max={85} step={1} value={th1} onChange={(x) => setSim("rr_th", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="θ₂ refracted" value={r.tir ? "TIR" : fmt(r.th2Deg, 1)} unit={r.tir ? "" : "°"} accent={r.tir ? "#ff7a9c" : "#53e8ff"} />
          <Stat label="n₁ sin θ₁" value={fmt(n1 * Math.sin((th1 * Math.PI) / 180), 3)} unit="" accent="#ffe08a" />
        </div>
      </ControlPanel>
    </>
  );
}

/* ================= Lens ================= */
function LensCanvas() {
  const ref = useCanvasLoop((ctx, w, h) => {
    const convex = Boolean(useStore.getState().sim.ln_convex);
    const fMag = Number(useStore.getState().sim.ln_f);
    const u = Number(useStore.getState().sim.ln_u);
    const f = convex ? fMag : -fMag;
    const out = thinLens(f, u);
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2; const cy = h * 0.54;
    const span = Math.max(u, Math.abs(out.v) || 0, 2 * Math.abs(f)) * 1.12;
    const sc = (w * 0.46) / Math.max(span, 1);
    const ho = Math.min(h * 0.2, 84);

    // axis
    ctx.strokeStyle = "rgba(233,241,255,0.3)";
    ctx.setLineDash([6, 7]);
    ctx.beginPath(); ctx.moveTo(10, cy); ctx.lineTo(w - 10, cy); ctx.stroke();
    ctx.setLineDash([]);

    // lens
    const lh = Math.min(h * 0.62, 300);
    ctx.strokeStyle = "rgba(122,223,255,0.9)";
    ctx.fillStyle = "rgba(122,223,255,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (convex) {
      ctx.ellipse(cx, cy, 15, lh / 2, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(cx - 13, cy - lh / 2);
      ctx.lineTo(cx + 13, cy - lh / 2);
      ctx.quadraticCurveTo(cx - 9, cy, cx + 13, cy + lh / 2);
      ctx.lineTo(cx - 13, cy + lh / 2);
      ctx.quadraticCurveTo(cx + 9, cy, cx - 13, cy - lh / 2);
    }
    ctx.fill();
    ctx.stroke();

    // focal points
    ctx.fillStyle = "#ffe08a";
    for (const fx of [cx - Math.abs(f) * sc, cx + Math.abs(f) * sc]) {
      ctx.beginPath(); ctx.arc(fx, cy, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText("F", cx - Math.abs(f) * sc, cy + 18);
    ctx.fillText("F′", cx + Math.abs(f) * sc, cy + 18);

    const Ox = cx - u * sc;
    const Oy = cy - ho;
    const vX = cx + out.v * sc;
    const hi = out.m * ho;
    const imgY = cy - hi;

    const line = (x1: number, y1: number, x2: number, y2: number, color: string, dash = false, lw = 1.8) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      if (dash) ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();
    };
    const extend = (x0: number, y0: number, dx: number, dy: number) => {
      const tR = (w - 20 - x0) / dx;
      const tL = (20 - x0) / dx;
      const t = dx > 0 ? tR : tL;
      return [x0 + dx * t, y0 + dy * t] as const;
    };

    // ray 1: parallel → (through F' | from F)
    line(Ox, Oy, cx, Oy, "#ffb454");
    {
      const dx = Math.abs(f) * sc;
      const dy = Math.sign(f) * ho;
      const [ex, ey] = extend(cx, Oy, dx, dy);
      if (out.real) line(cx, Oy, ex, ey, "#ffb454");
      else { line(cx, Oy, ex, ey, "#ffb454"); line(cx, Oy, vX, imgY, "#ffb454", true); }
    }
    // ray 2: through centre
    {
      const dx = cx - Ox; const dy = cy - Oy;
      const [ex, ey] = extend(cx, cy, dx, dy);
      line(Ox, Oy, ex, ey, "#39f0c3");
      if (!out.real) line(cx, cy, vX, imgY, "#39f0c3", true);
    }
    // ray 3: through/toward focal point → parallel
    {
      if (convex) {
        const Fx = cx - f * sc;
        const t = u / (u - f);
        const y3 = Oy + t * (cy - Oy);
        line(Ox, Oy, cx, y3, "#7adfff");
        line(cx, y3, w - 20, y3, "#7adfff");
        if (!out.real) line(cx, y3, vX, imgY, "#7adfff", true);
      } else {
        const Fx2 = cx + Math.abs(f) * sc;
        const t = u / (u + Math.abs(f));
        const y3 = Oy + t * (cy - Oy);
        line(Ox, Oy, cx, y3, "#7adfff");
        line(cx, y3, w - 20, y3, "#7adfff");
        line(cx, y3, Fx2, cy, "#7adfff", true);
        line(cx, y3, vX, imgY, "#7adfff", true);
      }
    }

    // object arrow
    const arrowV = (x: number, y1: number, y2: number, color: string, dash = false) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.4;
      if (dash) ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
      ctx.setLineDash([]);
      const dir = y2 < y1 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y2 + dir * 2);
      ctx.lineTo(x - 5, y2 + dir * 10);
      ctx.lineTo(x + 5, y2 + dir * 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    arrowV(Ox, cy, Oy, "#ffb454");
    arrowV(vX, cy, imgY, out.real ? "#39f0c3" : "rgba(57,240,195,0.85)", !out.real);

    ctx.font = "500 10px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#ffb454";
    ctx.fillText("object", Ox, cy + 18);
    ctx.fillStyle = "#39f0c3";
    ctx.fillText(out.real ? "real image" : "virtual image", vX, cy + (out.inverted ? -12 : 18));
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function LensUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const convex = Boolean(sim.ln_convex);
  const fMag = Number(sim.ln_f);
  const u = Number(sim.ln_u);
  const f = convex ? fMag : -fMag;
  const out = thinLens(f, u);
  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><LensCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Lens Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Thin Lens Equation",
          formula: "1/f = 1/v − 1/u     m = v/u",
          vars: [["f", `${f} cm (${convex ? "convex" : "concave"})`], ["u", `−${u} cm (object, left)`], ["v", `${fmt(out.v, 1)} cm`], ["m", fmt(out.m, 2)]],
          steps: [
            `1/v = 1/f + 1/u = 1/(${f}) + 1/(−${u})`,
            `1/v = ${fmt(1 / f, 4)} − ${fmt(1 / u, 4)} = ${fmt(1 / f - 1 / u, 4)}`,
            `v = ${fmt(out.v, 1)} cm  (${out.real ? "right side — real" : "left side — virtual"})`,
            `m = v/u = ${fmt(out.m, 2)}  →  ${out.inverted ? "inverted" : "upright"}, ${Math.abs(out.m) > 1 ? "magnified" : "diminished"}`,
          ],
          result: `v = ${fmt(out.v, 1)} cm   •   m = ${fmt(out.m, 2)}×   •   ${out.real ? "REAL" : "VIRTUAL"} + ${out.inverted ? "INVERTED" : "UPRIGHT"}`,
          note: "Cartesian sign convention: light travels left → right; distances against it are negative.",
        })} />}
      >
        <Seg options={[{ id: "cv", label: "Convex" }, { id: "cc", label: "Concave" }]} value={convex ? "cv" : "cc"} onChange={(v) => setSim("ln_convex", v === "cv")} />
        <Slider label="Focal length |f|" unit="cm" min={5} max={25} step={0.5} value={fMag} onChange={(x) => setSim("ln_f", x)} />
        <Slider label="Object distance u" unit="cm" min={8} max={60} step={1} value={u} onChange={(x) => setSim("ln_u", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Image dist. v" value={Number.isFinite(out.v) ? fmt(out.v, 1) : "—"} unit="cm" accent="#39f0c3" />
          <Stat label="Magnification" value={Number.isFinite(out.m) ? fmt(out.m, 2) : "—"} unit="×" />
          <Stat label="Nature" value={out.real ? "Real" : "Virtual"} accent={out.real ? "#39f0c3" : "#cf8bff"} />
          <Stat label="Orientation" value={out.inverted ? "Inverted" : "Upright"} />
        </div>
      </ControlPanel>
    </>
  );
}

export default function OpticsWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "reflection" && <ReflectionUI />}
      {exp === "refraction" && <RefractionUI />}
      {exp === "lens" && <LensUI />}
    </div>
  );
}
