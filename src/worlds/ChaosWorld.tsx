import { useRef } from "react";
import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { lorenzStep, fmt } from "../physics";

const META = WORLDS.find((w) => w.id === "chaos")!;

function LorenzCanvas() {
  const points = useRef<{ x: number; y: number; z: number }[]>([{ x: 0.1, y: 0, z: 0 }]);
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const sim = useStore.getState().sim;
    const sigma = Number(sim.lz_sigma ?? 10);
    const rho = Number(sim.lz_rho ?? 28);
    const beta = Number(sim.lz_beta ?? 2.667);
    const stepDt = Number(sim.lz_dt ?? 0.01);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Integrate Lorenz system
    const stepsPerFrame = 10;
    for (let i = 0; i < stepsPerFrame; i++) {
      const last = points.current[points.current.length - 1];
      const next = lorenzStep(last, sigma, rho, beta, stepDt);
      points.current.push(next);
      if (points.current.length > 5000) points.current.shift();
    }

    // Project 3D to 2D (simple orthographic)
    const cx = w / 2;
    const cy = h / 2;
    const scale = 8;

    // Draw trajectory
    ctx.strokeStyle = "rgba(224, 86, 253, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.current.forEach((p, i) => {
      const x = cx + p.x * scale;
      const y = cy - p.z * scale + 200;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Current point
    const last = points.current[points.current.length - 1];
    const px = cx + last.x * scale;
    const py = cy - last.z * scale + 200;
    ctx.fillStyle = "#e056fd";
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#fff";
    ctx.font = "12px 'IBM Plex Mono'";
    ctx.fillText(`σ = ${fmt(sigma, 2)}`, 20, 30);
    ctx.fillText(`ρ = ${fmt(rho, 2)}`, 20, 50);
    ctx.fillText(`β = ${fmt(beta, 3)}`, 20, 70);
    ctx.fillText(`x = ${fmt(last.x, 2)}`, 20, 90);
    ctx.fillText(`y = ${fmt(last.y, 2)}`, 20, 110);
    ctx.fillText(`z = ${fmt(last.z, 2)}`, 20, 130);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function LorenzUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const sigma = Number(sim.lz_sigma ?? 10);
  const rho = Number(sim.lz_rho ?? 28);
  const beta = Number(sim.lz_beta ?? 2.667);

  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><LorenzCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Lorenz Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Lorenz System",
          formula: "dx/dt = σ(y-x)    dy/dt = x(ρ-z)-y    dz/dt = xy-βz",
          vars: [["σ", `${fmt(sigma, 2)}`], ["ρ", `${fmt(rho, 2)}`], ["β", `${fmt(beta, 3)}`]],
          steps: [
            "Three coupled nonlinear ODEs",
            "Deterministic yet chaotic for ρ > 24.74",
            "Sensitive to initial conditions (butterfly effect)",
            "Strange attractor with fractal dimension ~2.06",
          ],
          result: `σ = ${fmt(sigma, 2)}    ρ = ${fmt(rho, 2)}    β = ${fmt(beta, 3)}`,
          note: "Edward Lorenz discovered chaos in 1963 while modeling atmospheric convection. The system is deterministic but unpredictable beyond short timescales.",
        })} />}
      >
        <Slider label="σ (Prandtl)" unit="" min={0} max={20} step={0.1} value={sigma} onChange={(x) => setSim("lz_sigma", x)} />
        <Slider label="ρ (Rayleigh)" unit="" min={0} max={50} step={0.1} value={rho} onChange={(x) => setSim("lz_rho", x)} />
        <Slider label="β" unit="" min={0} max={5} step={0.01} value={beta} onChange={(x) => setSim("lz_beta", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Regime" value={rho > 24.74 ? "Chaotic" : "Stable"} accent={rho > 24.74 ? "#e056fd" : "#2ecc71"} />
        </div>
        <p className="text-[10px] leading-relaxed text-[#5a6d94]">
          The Lorenz attractor emerges when ρ &gt; 24.74. Try adjusting the parameters to see the transition from stable fixed points to chaos.
        </p>
      </ControlPanel>
    </>
  );
}

export default function ChaosWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "lorenz" && <LorenzUI />}
    </div>
  );
}
