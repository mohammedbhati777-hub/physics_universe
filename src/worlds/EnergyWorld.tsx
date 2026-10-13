import { useStore, WORLDS } from "../store";
import { WorldTabs, ControlPanel, Slider, Stat, EqButton, useCanvasLoop, CanvasFrame } from "../components/ui";
import { solarCell, gridFrequency, fmt } from "../physics";

const META = WORLDS.find((w) => w.id === "energy")!;

function SolarCanvas() {
  const ref = useCanvasLoop((ctx, w, h, _t) => {
    const sim = useStore.getState().sim;
    const irr = Number(sim.sc_irr ?? 1000);
    const temp = Number(sim.sc_temp ?? 25);
    const shade = Number(sim.sc_shade ?? 0);
    const { Voc, Isc, Pmax, eff } = solarCell(irr, temp, shade);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Sun
    const sunX = w * 0.2;
    const sunY = h * 0.2;
    const sunR = 30 + (irr / 1000) * 20;
    const grad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2);
    grad.addColorStop(0, "rgba(249, 202, 36, 0.8)");
    grad.addColorStop(0.5, "rgba(249, 202, 36, 0.3)");
    grad.addColorStop(1, "rgba(249, 202, 36, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(sunX - sunR * 2, sunY - sunR * 2, sunR * 4, sunR * 4);
    ctx.fillStyle = "#f9ca24";
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // Rays
    ctx.strokeStyle = "rgba(249, 202, 36, 0.4)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(sunX + Math.cos(angle) * (sunR + 10), sunY + Math.sin(angle) * (sunR + 10));
      ctx.lineTo(sunX + Math.cos(angle) * (sunR + 30), sunY + Math.sin(angle) * (sunR + 30));
      ctx.stroke();
    }

    // Solar panel
    const panelX = w * 0.5;
    const panelY = h * 0.6;
    const panelW = 150;
    const panelH = 100;
    ctx.save();
    ctx.translate(panelX, panelY);
    ctx.rotate(-0.2);
    ctx.fillStyle = "rgba(52, 73, 94, 0.8)";
    ctx.fillRect(-panelW / 2, -panelH / 2, panelW, panelH);
    ctx.strokeStyle = "#34495e";
    ctx.lineWidth = 3;
    ctx.strokeRect(-panelW / 2, -panelH / 2, panelW, panelH);
    // Grid lines
    ctx.strokeStyle = "rgba(249, 202, 36, 0.3)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-panelW / 2 + (i * panelW) / 4, -panelH / 2);
      ctx.lineTo(-panelW / 2 + (i * panelW) / 4, panelH / 2);
      ctx.stroke();
    }
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-panelW / 2, -panelH / 2 + (i * panelH) / 3);
      ctx.lineTo(panelW / 2, -panelH / 2 + (i * panelH) / 3);
      ctx.stroke();
    }
    // Shading overlay
    if (shade > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${shade * 0.7})`;
      ctx.fillRect(-panelW / 2, -panelH / 2, panelW * shade, panelH);
    }
    ctx.restore();

    // Power output
    ctx.fillStyle = "#f9ca24";
    ctx.font = "bold 16px 'IBM Plex Mono'";
    ctx.fillText(`P = ${fmt(Pmax, 1)} W`, 20, 30);
    ctx.fillStyle = "#fff";
    ctx.font = "12px 'IBM Plex Mono'";
    ctx.fillText(`Voc = ${fmt(Voc, 2)} V`, 20, 50);
    ctx.fillText(`Isc = ${fmt(Isc, 2)} A`, 20, 70);
    ctx.fillText(`η = ${fmt(eff, 1)}%`, 20, 90);
    ctx.fillText(`Irradiance = ${fmt(irr, 0)} W/m²`, 20, 110);
    ctx.fillText(`Temp = ${fmt(temp, 0)}°C`, 20, 130);
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function SolarUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const irr = Number(sim.sc_irr ?? 1000);
  const temp = Number(sim.sc_temp ?? 25);
  const shade = Number(sim.sc_shade ?? 0);
  const { Voc, Isc, Pmax, eff } = solarCell(irr, temp, shade);

  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><SolarCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Solar Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Solar Cell Model",
          formula: "I = Iph - I0·(e^(V/nVT) - 1)",
          vars: [["Irradiance", `${irr} W/m²`], ["Temperature", `${temp}°C`], ["Shading", `${fmt(shade * 100, 0)}%`]],
          steps: [
            `Iph = (Irr/1000) × 9A = ${fmt(Isc, 2)} A`,
            `Voc = nVT·ln(Iph/I0 + 1) = ${fmt(Voc, 2)} V`,
            `Pmax = Isc × Voc × FF = ${fmt(Pmax, 1)} W`,
            `η = Pmax / (Irr × Area) = ${fmt(eff, 1)}%`,
          ],
          result: `Pmax = ${fmt(Pmax, 1)} W    η = ${fmt(eff, 1)}%`,
          note: "Single diode model with fill factor ~0.75. Real panels have temperature coefficients and series resistance.",
        })} />}
      >
        <Slider label="Irradiance" unit="W/m²" min={0} max={1200} step={10} value={irr} onChange={(x) => setSim("sc_irr", x)} />
        <Slider label="Temperature" unit="°C" min={-20} max={80} step={1} value={temp} onChange={(x) => setSim("sc_temp", x)} />
        <Slider label="Shading" unit="%" min={0} max={100} step={1} value={shade * 100} onChange={(x) => setSim("sc_shade", x / 100)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Power" value={fmt(Pmax, 1)} unit="W" accent="#f9ca24" />
          <Stat label="Efficiency" value={fmt(eff, 1)} unit="%" />
          <Stat label="Voc" value={fmt(Voc, 2)} unit="V" />
          <Stat label="Isc" value={fmt(Isc, 2)} unit="A" />
        </div>
      </ControlPanel>
    </>
  );
}

function GridCanvas() {
  const ref = useCanvasLoop((ctx, w, h, _t, dt) => {
    const sim = useStore.getState().sim;
    const load = Number(sim.gf_load ?? 500);
    const gen = Number(sim.gf_gen ?? 500);
    const inertia = Number(sim.gf_inertia ?? 5);
    const { f, P, df } = gridFrequency(load, gen, inertia, dt);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0a0e1a";
    ctx.fillRect(0, 0, w, h);

    // Grid visualization
    const cx = w / 2;
    const cy = h / 2;
    const radius = 80;

    // Frequency indicator
    const freqOffset = (f - 50) * 10;
    ctx.strokeStyle = Math.abs(f - 50) < 0.1 ? "#2ecc71" : Math.abs(f - 50) < 0.5 ? "#f9ca24" : "#e74c3c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Frequency needle
    const needleAngle = -Math.PI / 2 + freqOffset * 0.1;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleAngle) * (radius - 10), cy + Math.sin(needleAngle) * (radius - 10));
    ctx.stroke();

    // Load and generation indicators
    ctx.fillStyle = "#3498db";
    ctx.font = "bold 14px 'IBM Plex Mono'";
    ctx.fillText(`Load: ${fmt(load, 0)} MW`, 20, 30);
    ctx.fillStyle = "#2ecc71";
    ctx.fillText(`Gen: ${fmt(gen, 0)} MW`, 20, 50);
    ctx.fillStyle = "#fff";
    ctx.fillText(`f = ${fmt(f, 3)} Hz`, 20, 70);
    ctx.fillText(`ΔP = ${fmt(P, 0)} MW`, 20, 90);
    ctx.fillText(`Inertia = ${fmt(inertia, 1)} s`, 20, 110);

    // Power flow arrows
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - radius - 30, cy);
    ctx.lineTo(cx - radius - 10, cy);
    ctx.stroke();
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.moveTo(cx - radius - 10, cy);
    ctx.lineTo(cx - radius - 20, cy - 5);
    ctx.lineTo(cx - radius - 20, cy + 5);
    ctx.fill();

    ctx.strokeStyle = "#3498db";
    ctx.beginPath();
    ctx.moveTo(cx + radius + 10, cy);
    ctx.lineTo(cx + radius + 30, cy);
    ctx.stroke();
    ctx.fillStyle = "#3498db";
    ctx.beginPath();
    ctx.moveTo(cx + radius + 30, cy);
    ctx.lineTo(cx + radius + 20, cy - 5);
    ctx.lineTo(cx + radius + 20, cy + 5);
    ctx.fill();
  });
  return <canvas ref={ref} className="block h-full w-full" />;
}

function GridUI() {
  const sim = useStore((s) => s.sim);
  const setSim = useStore((s) => s.setSim);
  const openEq = useStore((s) => s.openEq);
  const load = Number(sim.gf_load ?? 500);
  const gen = Number(sim.gf_gen ?? 500);
  const inertia = Number(sim.gf_inertia ?? 5);
  const { f, P } = gridFrequency(load, gen, inertia, 1);

  return (
    <>
      <div className="pointer-events-auto absolute bottom-[4.9rem] left-3 right-3 top-[6.6rem] md:bottom-4 md:left-[11.5rem] md:right-[21.5rem] md:top-16">
        <CanvasFrame className="h-full w-full"><GridCanvas /></CanvasFrame>
      </div>
      <ControlPanel
        title="Grid Controls" color={META.color}
        footer={<EqButton onClick={() => openEq({
          title: "Grid Frequency Control",
          formula: "Δf = ΔP / (2H·f0)",
          vars: [["Load", `${load} MW`], ["Generation", `${gen} MW`], ["Inertia H", `${inertia} s`]],
          steps: [
            `ΔP = Gen - Load = ${fmt(P, 0)} MW`,
            `Δf = ΔP / (2 × ${inertia} × 50) = ${fmt((f - 50), 3)} Hz`,
            `f = 50 + Δf = ${fmt(f, 3)} Hz`,
          ],
          result: `f = ${fmt(f, 3)} Hz    ΔP = ${fmt(P, 0)} MW`,
          note: "Grid frequency must stay within ±0.5 Hz. Inertia provides short-term stability; governors provide long-term control.",
        })} />}
      >
        <Slider label="Load" unit="MW" min={100} max={2000} step={10} value={load} onChange={(x) => setSim("gf_load", x)} />
        <Slider label="Generation" unit="MW" min={100} max={2000} step={10} value={gen} onChange={(x) => setSim("gf_gen", x)} />
        <Slider label="Inertia" unit="s" min={1} max={10} step={0.5} value={inertia} onChange={(x) => setSim("gf_inertia", x)} />
        <div className="grid grid-cols-2 gap-1.5">
          <Stat label="Frequency" value={fmt(f, 3)} unit="Hz" accent={Math.abs(f - 50) < 0.1 ? "#2ecc71" : "#e74c3c"} />
          <Stat label="Power balance" value={fmt(P, 0)} unit="MW" />
        </div>
      </ControlPanel>
    </>
  );
}

export default function EnergyWorld() {
  const exp = useStore((s) => s.exp);
  const setExp = useStore((s) => s.setExp);
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <WorldTabs items={META.experiments} active={exp} onSelect={setExp} color={META.color} />
      {exp === "solar" && <SolarUI />}
      {exp === "grid" && <GridUI />}
    </div>
  );
}
