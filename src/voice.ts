/* Voice narration via the Web Speech API — zero assets.
   Hardened against the two classic Chrome bugs:
   1. utterances garbage-collected mid-speech (we keep a live reference)
   2. the first speak() silently dropped (we warm the engine on first pointerdown)
   Respects the global sound toggle; fully guarded for unsupported browsers. */

let enabled = true;
let cachedVoices: SpeechSynthesisVoice[] = [];
let current: SpeechSynthesisUtterance | null = null;
let warmed = false;

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  } catch { return null; }
}

function refreshVoices() {
  const s = synth();
  if (!s) return;
  try { cachedVoices = s.getVoices() || []; } catch { cachedVoices = []; }
}

/** Call once on app mount. Registers voice loading + the pointerdown warm-up. */
export function initVoice() {
  const s = synth();
  if (!s) return;
  refreshVoices();
  try { s.addEventListener?.("voiceschanged", refreshVoices); } catch { /* older browsers */ }
  if (!warmed) {
    const warm = () => {
      warmed = true;
      try {
        refreshVoices();
        s.cancel();
        s.resume(); // Chrome can leave the queue "paused" and swallow the first speak()
      } catch { /* noop */ }
    };
    window.addEventListener("pointerdown", warm, { once: true, capture: true });
  }
}

export function setVoiceEnabled(b: boolean) {
  enabled = b;
  if (!b) cancelVoice();
}

export function cancelVoice() {
  try { synth()?.cancel(); } catch { /* noop */ }
  current = null;
}

const PREFERRED = [
  "Google UK English Female",
  "Google US English",
  "Microsoft Aria",
  "Microsoft Libby",
  "Microsoft Jenny",
  "Samantha",
  "Victoria",
  "Daniel",
];

function pickVoice(): SpeechSynthesisVoice | null {
  if (!cachedVoices.length) refreshVoices();
  if (!cachedVoices.length) return null;
  for (const p of PREFERRED) {
    const v = cachedVoices.find((x) => x.name.includes(p));
    if (v) return v;
  }
  return cachedVoices.find((v) => v.lang?.toLowerCase().startsWith("en")) ?? cachedVoices[0];
}

export function speak(text: string, opts: { rate?: number; pitch?: number; interrupt?: boolean } = {}) {
  if (!enabled || !text) return;
  const s = synth();
  if (!s) return;
  try {
    if (opts.interrupt !== false) s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = opts.rate ?? 0.97;
    u.pitch = opts.pitch ?? 1;
    u.volume = 1;
    u.onend = () => { if (current === u) current = null; };
    u.onerror = () => { if (current === u) current = null; };
    current = u; // critical: unreferenced utterances get GC'd in Chrome
    s.resume();
    s.speak(u);
  } catch { /* speech unavailable */ }
}
