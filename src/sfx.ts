/* Tiny WebAudio feedback layer — no assets, lazily initialized on first gesture. */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSfxEnabled(b: boolean) { enabled = b; }

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, dur = 0.08, type: OscillatorType = "sine", gain = 0.04, delay = 0) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch { /* audio unavailable */ }
}

export const sfx = {
  tick: () => tone(760, 0.05, "sine", 0.02),
  hover: () => tone(540, 0.045, "sine", 0.014),
  enter: () => { tone(300, 0.28, "sine", 0.04); tone(452, 0.3, "sine", 0.035, 0.09); tone(604, 0.4, "sine", 0.03, 0.18); },
  launch: () => { tone(170, 0.32, "sawtooth", 0.028); tone(340, 0.22, "sine", 0.03, 0.06); },
  success: () => { tone(523, 0.12, "sine", 0.045); tone(659, 0.12, "sine", 0.045, 0.11); tone(784, 0.3, "sine", 0.05, 0.22); },
  fail: () => { tone(220, 0.22, "sawtooth", 0.026); tone(155, 0.3, "sawtooth", 0.026, 0.13); },
  blip: () => tone(980, 0.06, "triangle", 0.022),
};
