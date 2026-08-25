import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X } from "lucide-react";
import { useStore, WorldId } from "../store";
import { sfx } from "../sfx";

interface KBEntry { keys: string[]; reply: string; go?: { world: WorldId; exp: string } }

const KB: KBEntry[] = [
  {
    keys: ["satellite", "orbit", "fall", "iss"],
    go: { world: "space", exp: "satellite" },
    reply: "A satellite IS falling — constantly. Gravity pulls it Earthward, but its tangential speed carries it forward so fast that the ground curves away at the same rate it drops. At ~400 km altitude that speed is ≈ 7.7 km/s. I've opened the Satellite Orbit simulator — watch the velocity stay tangent while gravity points inward.",
  },
  {
    keys: ["newton", "third", "action", "reaction", "momentum"],
    go: { world: "mechanics", exp: "collision" },
    reply: "Newton's Third Law: forces always come in pairs — F₁₂ = −F₂₁. In a collision, whatever momentum body A loses, body B gains, so total momentum m₁v₁ + m₂v₂ is conserved. I've opened the Collision Lab: check that momentum before = momentum after.",
  },
  {
    keys: ["refract", "snell", "bend", "glass", "water"],
    go: { world: "optics", exp: "refraction" },
    reply: "Light changes speed between media, so it changes direction: n₁ sin θ₁ = n₂ sin θ₂ (Snell's law). Entering a denser medium (higher n) it bends toward the normal. From dense to thin, beyond the critical angle, you get total internal reflection. The Refraction lab is open — drag θ₁ and n₂.",
  },
  {
    keys: ["reflect", "mirror"],
    go: { world: "optics", exp: "reflection" },
    reply: "The law of reflection: the angle of incidence equals the angle of reflection (θᵢ = θᵣ), both measured from the normal to the surface. Try the Reflection lab and rotate the incident ray — the reflected ray mirrors it exactly.",
  },
  {
    keys: ["lens", "focus", "image", "convex", "concave"],
    go: { world: "optics", exp: "lens" },
    reply: "A thin lens maps object distance u to image distance v via 1/f = 1/v − 1/u, with magnification m = v/u. Convex lenses converge light (real inverted images beyond f); concave lenses diverge (always virtual, upright, smaller). The Lens Lab shows the three principal rays live.",
  },
  {
    keys: ["interference", "superposition", "slit", "fringe"],
    go: { world: "waves", exp: "interference" },
    reply: "When two waves overlap, their displacements add. In phase (Δφ = 0, 2π…) they reinforce — constructive interference. Out of phase by π they cancel — destructive. That's exactly the stripe pattern in the Interference lab, and in the double-slit experiment too.",
  },
  {
    keys: ["doppler", "siren", "ambulance", "redshift"],
    go: { world: "waves", exp: "doppler" },
    reply: "A moving source squeezes wavefronts ahead of it and stretches them behind: f′ = f(v ± v₀)/(v ∓ vₛ). Approaching → higher pitch; receding → lower. The same math gives astronomers redshift from receding galaxies. Try the Doppler lab.",
  },
  {
    keys: ["ohm", "current", "voltage", "resist", "circuit"],
    go: { world: "electricity", exp: "ohm" },
    reply: "Ohm's law: V = I·R. Voltage pushes, resistance opposes, current is what flows: I = V/R. Power dissipated is P = V·I = I²R. In the Ohm's Law lab, raise R and watch the electron flow slow instantly.",
  },
  {
    keys: ["electric field", "charge", "coulomb", "field line"],
    go: { world: "electricity", exp: "field" },
    reply: "A charge Q creates a field E = kQ/r² pointing away if positive, inward if negative (k ≈ 8.99×10⁹ N·m²/C²). Field lines start on + and end on −. Drag the charges in the Electric Field lab and read the field strength under your cursor.",
  },
  {
    keys: ["magnetic", "solenoid", "wire", "electromagnet"],
    go: { world: "electricity", exp: "magnet" },
    reply: "A current-carrying wire wraps space in circular field lines: B = μ₀I/(2πr). Flip the current and the right-hand rule flips the field with it. The Magnetic Field lab shows exactly this — slide the current and watch the rings respond.",
  },
  {
    keys: ["black hole", "event horizon", "singularity", "accretion"],
    go: { world: "space", exp: "blackhole" },
    reply: "Inside the event horizon (radius Rₛ = 2GM/c²) escape velocity exceeds c, so nothing — not even light — leaves. Infalling matter forms a hot accretion disk orbiting near light speed. The Black Hole visual is a simplified educational model, but the radius and orbital speeds use real formulas.",
  },
  {
    keys: ["escape", "rocket", "leave earth"],
    go: { world: "space", exp: "escape" },
    reply: "Escape velocity is the speed where kinetic energy exactly cancels gravitational binding: vₑ = √(2GM/R). For Earth that's ≈ 11.2 km/s. Below it, the rocket falls back; above, it never returns. Test the boundary in the Escape Velocity lab.",
  },
  {
    keys: ["tunnel", "barrier", "quantum", "probability"],
    go: { world: "quantum", exp: "tunneling" },
    reply: "Classically, a particle with E < V₀ can't cross a barrier. Quantum-mechanically its wavefunction decays inside the barrier as e^(−κx), giving transmission T ≈ e^(−2κa), κ = √(2m(V₀−E))/ħ. Thin, low barriers → real tunneling. It's how the sun fuses and how flash memory works. (Simplified model in the lab.)",
  },
  {
    keys: ["projectile", "trajectory", "throw", "ballistic"],
    go: { world: "mechanics", exp: "projectile" },
    reply: "Split the launch velocity: vₓ = v₀cosθ stays constant (no air drag), v_y = v₀sinθ − gt falls under gravity. The path is a parabola; range peaks at 45° on flat ground. Launch one in the Projectile lab and compare with air resistance on.",
  },
  {
    keys: ["pendulum", "swing", "period"],
    go: { world: "mechanics", exp: "pendulum" },
    reply: "For small angles a pendulum's period is T = 2π√(L/g) — independent of mass! Large amplitudes add a correction (my model includes the θ²/16 term). Energy sloshes between ½mL²ω² and mgL(1−cosθ). Watch the energy bars trade places in the Pendulum Lab.",
  },
  {
    keys: ["wave", "frequency", "wavelength", "speed"],
    go: { world: "waves", exp: "wave" },
    reply: "Every periodic wave obeys v = f·λ: speed = frequency × wavelength. Raise the frequency and the wavelength shrinks to keep v fixed by the medium. y(x,t) = A sin(kx − ωt + φ) is plotted live in the Wave Tank.",
  },
];

const QUICK = [
  "Why doesn't a satellite fall to Earth?",
  "Show me Newton's Third Law",
  "Explain refraction",
  "What is quantum tunneling?",
];

interface Msg { role: "user" | "bot"; text: string; go?: { world: WorldId; exp: string } }

export default function PhyX() {
  const open = useStore((s) => s.phyxOpen);
  const setPanel = useStore((s) => s.setPanel);
  const enterWorld = useStore((s) => s.enterWorld);
  const setExp = useStore((s) => s.setExp);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "bot", text: "PHY-X online. I explain concepts and jump you straight into the relevant simulation. Ask me anything about the physics you see." },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach(clearInterval); }, []);

  const botSay = (text: string, go?: { world: WorldId; exp: string }) => {
    setTyping(true);
    const idxRef = { i: 0 };
    setMsgs((m) => [...m, { role: "bot", text: "", go }]);
    const iv = window.setInterval(() => {
      idxRef.i += 3;
      setMsgs((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, text: text.slice(0, idxRef.i) };
        return copy;
      });
      if (idxRef.i >= text.length) {
        clearInterval(iv);
        setTyping(false);
        if (go) window.setTimeout(() => { enterWorld(go.world); setExp(go.exp); }, 450);
      }
    }, 14);
    timers.current.push(iv);
  };

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || typing) return;
    sfx.blip();
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    const low = text.toLowerCase();
    const hit = KB.find((e) => e.keys.some((k) => low.includes(k)));
    window.setTimeout(() => {
      if (hit) botSay(hit.reply, hit.go);
      else botSay("I map that to the simulations you can explore: mechanics, electricity, waves, optics, space or quantum. Try asking about orbits, refraction, tunneling, circuits, interference, momentum, the Doppler effect, or black holes.");
    }, 350);
  };

  return (
    <>
      <button
        onClick={() => { setPanel("phyxOpen", !open); sfx.tick(); }}
        aria-label="Toggle PHY-X assistant"
        className="pv-hud-btn fixed bottom-4 right-4 z-40 !px-3 !py-2.5"
        style={open ? { borderColor: "rgba(83,232,255,0.6)", color: "#53e8ff" } : undefined}
      >
        <Bot size={15} className="text-[#53e8ff]" />
        <span className="hidden sm:inline">PHY-X</span>
        <span className="anim-blink ml-0.5 h-1.5 w-1.5 rounded-full bg-[#39f0c3]" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="phyx" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className="pv-panel-solid absolute bottom-20 right-4 z-40 flex h-[26rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl"
            role="dialog" aria-label="PHY-X assistant"
          >
            <div className="flex items-center justify-between border-b border-[rgba(96,145,255,0.12)] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Bot size={15} className="text-[#53e8ff]" />
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-[#53e8ff]">PHY-X Assistant</span>
              </div>
              <button onClick={() => setPanel("phyxOpen", false)} aria-label="Close" className="text-[#5a6d94] hover:text-[#e9f1ff]"><X size={15} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[88%] rounded-lg px-3 py-2 text-[12px] leading-relaxed ${m.role === "user" ? "bg-[rgba(83,232,255,0.14)] text-[#d8f6ff]" : "border border-[rgba(96,145,255,0.12)] bg-[rgba(7,11,22,0.7)] text-[#aebfe0]"}`}>
                    {m.text}
                    {m.go && m.text.length > 40 ? (
                      <button
                        onClick={() => { enterWorld(m.go!.world); setExp(m.go!.exp); }}
                        className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[#39f0c3] hover:underline"
                      >
                        Open simulation →
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[rgba(96,145,255,0.12)] p-2.5">
              <div className="mb-2 flex flex-wrap gap-1">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => ask(q)} className="rounded border border-[rgba(96,145,255,0.16)] px-2 py-1 text-[10px] text-[#8fa3c8] transition-colors hover:border-[rgba(83,232,255,0.4)] hover:text-[#53e8ff]">
                    {q}
                  </button>
                ))}
              </div>
              <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
                <input
                  value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about any physics concept…"
                  aria-label="Ask PHY-X"
                  className="min-w-0 flex-1 rounded-md border border-[rgba(96,145,255,0.2)] bg-[rgba(7,11,22,0.8)] px-2.5 py-2 text-[12px] text-[#e9f1ff] placeholder-[#5a6d94] focus:border-[rgba(83,232,255,0.5)] focus:outline-none"
                />
                <button type="submit" aria-label="Send" className="rounded-md border border-[rgba(83,232,255,0.35)] bg-[rgba(83,232,255,0.1)] px-2.5 text-[#53e8ff] hover:bg-[rgba(83,232,255,0.2)]"><Send size={14} /></button>
              </form>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
