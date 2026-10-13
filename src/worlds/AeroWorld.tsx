import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { airfoilLift, fmt } from "../physics";

const META = WORLDS.find((w) => w.id === "aero")!;

function AirfoilCanvas() {
  const ref = useCanvasLoop((ctx, w, h, _t) => {
    const sim = useStore.getState().sim;
    const alpha = Number(sim.af_alpha ?? 5);
    const v = Number(sim.af_v ?? 50);
    const c = Number(sim.af_c ?? 1);
    const rho = Number(sim.af_rho ?? 1.225);
    const { CL, CD, L, D, L_D } = airfoilLift(alpha, c, v, rho);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Flow lines
    ctx.strokeStyle = "rgba(78, 205, 196, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const y = (i / 20) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 10) {
        const dist = Math.abs(y - h / 2);
        const curve = dist < 100 ? Math.sin((x / w) * Math.PI) * (100 - dist) * 0.3 : 0;
        ctx.lineTo(x, y - curve);
      }
      ctx.stroke();
    }

    // Airfoil shape (NACA 4-digit approximation)
    const cx = w / 2;
    const cy = h / 2;
    const chord = c * 200;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((alpha * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(-chord / 2, 0);
    ctx.quadraticCurveTo(-chord / 4, -chord * 0.08, 0, -chord * 0.06);
    ctx.quadraticCurveTo(chord / 4, -chord * 0.04, chord / 2, 0);
    ctx.quadraticCurveTo(chord / 4, chord * 0.02, 0, chord * 0.03);
    ctx.quadraticCurveTo(-chord / 4, chord * 0.04, -chord / 2, 0);
    ctx.fillStyle = "rgba(78, 205, 196, 0.6)";
    ctx.fill();
    ctx.strokeStyle = "#4ecdc4";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Lift and drag arrows
    const liftScale = L * 0.01;
    const dragScale = D * 0.01;
    ctx.strokeStyle = "#4ecdc4";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - liftScale);
    ctx.stroke();
    ctx.fillStyle = "#4ecdc4";
    ctx.beginPath();
    ctx.moveTo(cx, cy - liftScale);
    ctx.lineTo(cx - 8, cy - liftScale + 15);
    ctx.lineTo(cx + 8, cy - liftScale + 15);
    ctx.fill();
    ctx.font = "bold 14px 'IBM Plex Mono'";
    ctx.fillText("L", cx + 10, cy - liftScale);

    ctx.strokeStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dragScale, cy);
    ctx.stroke();
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.moveTo(cx + dragScale, cy);
    ctx.lineTo(cx + dragScale - 15, cy - 8);
    ctx.lineTo(cx + dragScale - 15, cy + 8);
    ctx.fill();
    ctx.fillText("D", cx + dragScale + 10, cy);

    // Labels
    ctx.fillStyle = "#fff";
    ctx.font = "12px 'IBM Plex Mono'";
    ctx.fillText(`α = ${fmt(alpha, 1)}°`, 20, 30);
    ctx.fillText(`v = ${fmt(v, 1)} m/s`, 20, 50);
    ctx.fillText(`CL = ${fmt(CL, 3)}`, 20, 70);
    ctx.fillText(`CD = ${fmt(CD, 4)}`, 20, 90);
    ctx.fillText(`L/D = ${fmt(L_D, 2)}`, 20, 110);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function AirfoilUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const alpha = Number(sim.af_alpha ?? 5);
  const v = Number(sim.af_v ?? 50);
  const c = Number(sim.af_c ?? 1);
  const rho = Number(sim.af_rho ?? 1.225);
  const { CL, CD, L, D, L_D } = airfoilLift(alpha, c, v, rho);

  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><AirfoilCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Airfoil Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Thin Airfoil Theory",
          formula: "CL = 2π·α (rad)    L = ½ρv²c·CL",
          vars: [["α", `${alpha}° = ${fmt((alpha * Math.PI) / 180, 3)} rad`], ["v", `${v} m/s`], ["c", `${c} m`], ["ρ", `${rho} kg/m³`]],
          steps: [
            `CL = 2π × ${fmt((alpha * Math.PI) / 180, 3)} = ${fmt(CL, 3)}`,
            `L = ½ × ${rho} × ${v}² × ${c} × ${fmt(CL, 3)} = ${fmt(L, 1)} N`,
            `CD = 0.006 + 0.04·α² = ${fmt(CD, 4)}`,
            `D = ½ρv²c·CD = ${fmt(D, 2)} N`,
          ],
          result: `L = ${fmt(L, 1)} N    D = ${fmt(D, 2)} N    L/D = ${fmt(L_D, 2)}`,
          note: "Thin airfoil theory assumes small angles and inviscid flow. Real wings have stall, separation, and 3D effects.",
        })} />}
      >
        <Slider label="Angle of attack α" unit="°" min={-15} max={15} step={0.5} value={alpha} onChange={(x) => setSim("af_alpha", x)} />
        <Slider label="Velocity" unit="m/s" min={10} max={100} step={1} value={v} onChange={(x) => setSim("af_v", x)} />
        <Slider label="Chord length" unit="m" min={0.5} max={2} step={0.1} value={c} onChange={(x) => setSim("af_c", x)} />
        <Slider label="Air density" unit="kg/m³" min={0.5} max={1.5} step={0.01} value={rho} onChange={(x) => setSim("af_rho", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Lift L" value={fmt(L, 1)} unit="N" accent="#4ecdc4" />
          <Stat label="Drag D" value={fmt(D, 2)} unit="N" accent="#ff6b6b" />
          <Stat label="CL" value={fmt(CL, 3)} unit="" />
          <Stat label="CD" value={fmt(CD, 4)} unit="" />
          <Stat label="L/D ratio" value={fmt(L_D, 2)} unit="" accent="#f9ca24" />
        </div>
      </ControlPanel>
    </>
  );
}

export default function AeroWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "airfoil" && <AirfoilUI />}
    </div>
  );
}
