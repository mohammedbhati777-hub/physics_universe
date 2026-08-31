/* Cinematic narration via the Web Speech API.
   Movie-trailer delivery: deep, slow, with dramatic pauses between lines.
   Zero assets, lazily warmed on first user gesture, guarded everywhere. */

let enabled = true;
let cachedVoices: SpeechSynthesisVoice[] = [];
let current: SpeechSynthesisUtterance | null = null;
let queueTimer: number | null = null;

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

/** Warm the engine on the first user gesture — Chrome otherwise drops the very first speak(). */
export function initVoice() {
  const s = synth();
  if (!s) return;
  refreshVoices();
  try {
    s.addEventListener?.("voiceschanged", refreshVoices);
    s.resume();
    s.cancel();
  } catch { /* speech unavailable */ }
}

export function setVoiceEnabled(b: boolean) {
  enabled = b;
  if (!b) cancelVoice();
}

export function cancelVoice() {
  if (queueTimer !== null) { clearTimeout(queueTimer); queueTimer = null; }
  current = null;
  try { synth()?.cancel(); } catch { /* noop */ }
}

/* Deep, natural male voices first — they carry the trailer cadence best —
   then any clean English voice as fallback. */
const PREFERRED = [
  "Google UK English Male",
  "Daniel",
  "Microsoft Ryan",
  "Microsoft Guy",
  "Microsoft Davis",
  "Microsoft George",
  "Alex",
  "Google US English",
  "Microsoft Aria",
  "Samantha",
];

function pickVoice(): SpeechSynthesisVoice | null {
  if (!cachedVoices.length) refreshVoices();
  if (!cachedVoices.length) return null;
  for (const p of PREFERRED) {
    const v = cachedVoices.find((x) => x.name === p || x.name.includes(p));
    if (v) return v;
  }
  return cachedVoices.find((v) => v.lang?.toLowerCase().startsWith("en")) ?? cachedVoices[0];
}

/** Speak a multi-line script in trailer style: slow, low, dramatic gaps between lines. */
export function narrate(lines: string[], gapMs = 520) {
  cancelVoice();
  if (!enabled || lines.length === 0) return;
  const s = synth();
  if (!s) return;
  try { s.resume(); } catch { /* noop */ }
  let i = 0;
  const next = () => {
    if (i >= lines.length || !enabled) return;
    const u = new SpeechSynthesisUtterance(lines[i]);
    const v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = 0.84;   // slow, deliberate
    u.pitch = 0.78;  // deep register
    u.volume = 1;
    current = u;     // keep a live reference so the browser can't GC it mid-speech
    const advance = () => { i += 1; queueTimer = window.setTimeout(next, gapMs); };
    u.onend = advance;
    u.onerror = advance;
    try { s.speak(u); } catch { advance(); }
  };
  next();
}
