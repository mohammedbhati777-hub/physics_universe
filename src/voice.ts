/* Voice narration via the Web Speech API — zero assets, lazily initialized.
   Respects the global sound toggle; always guarded for unsupported browsers. */

let enabled = true;
let cachedVoices: SpeechSynthesisVoice[] = [];

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

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  try { window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices); } catch { /* older browsers */ }
}

export function setVoiceEnabled(b: boolean) {
  enabled = b;
  if (!b) cancelVoice();
}

export function cancelVoice() {
  try { synth()?.cancel(); } catch { /* noop */ }
}

const PREFERRED = ["Google UK English Male", "Google US English", "Microsoft Aria", "Microsoft Libby", "Samantha", "Daniel", "Alex"];

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
  if (!enabled) return;
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
    s.speak(u);
  } catch { /* speech unavailable */ }
}
