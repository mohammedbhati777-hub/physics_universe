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

/* ---------------- cinematic score (synth, no assets) ---------------- */

/** Low ambient drone swell that beds the welcome narration — fades in and out on its own. */
export function bed(duration = 9) {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 2.4);
    g.gain.setValueAtTime(0.05, t + Math.max(3, duration - 3.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 420;
    g.connect(lp).connect(c.destination);
    const layers: [number, OscillatorType, number][] = [
      [55, "sine", 0.8],
      [82.5, "sine", 0.55],
      [110.2, "triangle", 0.28],
    ];
    for (const [f, type, vol] of layers) {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      const og = c.createGain();
      og.gain.value = vol;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + duration);
    }
    // slow breathing tremolo
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.18;
    const lg = c.createGain();
    lg.gain.value = 0.014;
    lfo.connect(lg).connect(g.gain);
    lfo.start(t);
    lfo.stop(t + duration);
  } catch { /* audio unavailable */ }
}

/** Deep cinematic "braaam" impact — played when a world is entered. */
export function braam() {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.1, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1200, t);
    lp.frequency.exponentialRampToValueAtTime(130, t + 2.3);
    g.connect(lp).connect(c.destination);
    [43.65, 65.41, 87.31].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.detune.value = i * 7 - 7;
      o.connect(g);
      o.start(t);
      o.stop(t + 2.7);
    });
    const sub = c.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 29.14;
    const sg = c.createGain();
    sg.gain.value = 0.55;
    sub.connect(sg).connect(g);
    sub.start(t);
    sub.stop(t + 2.7);
  } catch { /* audio unavailable */ }
}

/** Soft rising shimmer — played when returning to the universe. */
export function shimmer() {
  if (!enabled) return;
  const c = ac();
  if (!c) return;
  try {
    const t = c.currentTime;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    const hp = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    g.connect(hp).connect(c.destination);
    [1318.5, 1760, 2093].forEach((f, i) => {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(f * 0.75, t);
      o.frequency.linearRampToValueAtTime(f, t + 0.9 + i * 0.15);
      const og = c.createGain();
      og.gain.value = 0.4 - i * 0.1;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 2.3);
    });
  } catch { /* audio unavailable */ }
}
