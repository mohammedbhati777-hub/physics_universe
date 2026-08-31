import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Bot, Clapperboard, Menu, Orbit, Pause, Play, RotateCcw, Target, Trophy, Volume2, VolumeX, X, Info } from "lucide-react";
import { useStore, WORLDS, levelFor } from "../store";
import { openPanel } from "./ui";
import { sfx, setSfxEnabled } from "../sfx";
import { setVoiceEnabled } from "../voice";

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="3.4" fill="#53e8ff" />
        <ellipse cx="16" cy="16" rx="13" ry="5.4" fill="none" stroke="#53e8ff" strokeWidth="1.4" transform="rotate(-24 16 16)" opacity="0.9" />
        <ellipse cx="16" cy="16" rx="13" ry="5.4" fill="none" stroke="#ffb454" strokeWidth="1.4" transform="rotate(36 16 16)" opacity="0.8" />
        <circle cx="27.4" cy="10.6" r="1.6" fill="#ffb454" />
      </svg>
      <div className="leading-none">
        <div className="font-display text-[15px] font-black tracking-[0.24em] text-[#e9f1ff]">PHYSICS<span className="text-[#53e8ff]">VERSE</span></div>
        <div className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.3em] text-[#5a6d94]">Interactive Physics Universe</div>
      </div>
    </div>
  );
}

export default function HUD() {
  const phase = useStore((s) => s.phase);
  const world = useStore((s) => s.world);
  const leaveWorld = useStore((s) => s.leaveWorld);
  const paused = useStore((s) => s.paused);
  const setPaused = useStore((s) => s.setPaused);
  const resetWorld = useStore((s) => s.resetWorld);
  const sound = useStore((s) => s.sound);
  const toggleSound = useStore((s) => s.toggleSound);
  const xp = useStore((s) => s.xp);
  const demo = useStore((s) => s.demo);
  const demoCaption = useStore((s) => s.demoCaption);
  const stopDemo = useStore((s) => s.stopDemo);
  const startDemo = useStore((s) => s.startDemo);
  const menuOpen = useStore((s) => s.menuOpen);
  const setPanel = useStore((s) => s.setPanel);

  const meta = WORLDS.find((w) => w.id === world);

  return (
    <>
      {/* top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 py-2.5 sm:px-4">
        <div className="pointer-events-auto flex items-center gap-3">
          {phase === "world" ? (
            <button
              onClick={() => { sfx.enter(); leaveWorld(); }}
              className="pv-hud-btn" aria-label="Return to universe"
            >
              <ArrowLeft size={13} /> <span className="hidden sm:inline">Return to Universe</span><span className="sm:hidden">Back</span>
            </button>
          ) : (
            <Logo />
          )}
        </div>
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {phase === "world" && meta ? (
            <div className="mr-1 hidden items-center gap-2 md:flex">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: meta.color }}>{meta.name}</span>
            </div>
          ) : null}
          <div className="pv-hud-btn cursor-default !border-[rgba(255,180,84,0.25)] !text-[#ffb454]" title="Experience points">
            <Trophy size={12} /> <span className="num">{xp}</span><span className="hidden text-[9px] opacity-70 sm:inline">LV {levelFor(xp)}</span>
          </div>
          <button className="pv-hud-btn" onClick={() => openPanel("missionsOpen")} aria-label="Missions"><Target size={13} /><span className="hidden lg:inline">Missions</span></button>
          <button className="pv-hud-btn" onClick={() => openPanel("progressOpen")} aria-label="Progress"><Trophy size={13} /><span className="hidden lg:inline">Progress</span></button>
          <button className="pv-hud-btn" onClick={() => openPanel("phyxOpen")} aria-label="PHY-X assistant"><Bot size={13} /><span className="hidden lg:inline">PHY-X</span></button>
          <button
            className="pv-hud-btn"
            title={sound ? "Sound & voice: ON" : "Sound & voice: OFF"}
            onClick={() => { toggleSound(); setSfxEnabled(!sound); setVoiceEnabled(!sound); }}
            aria-label="Toggle sound and voice narration"
          >
            {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span className="hidden text-[9px] opacity-70 xl:inline">{sound ? "VOICE ON" : "MUTED"}</span>
          </button>
          <button className="pv-hud-btn" onClick={() => { setPanel("menuOpen", !menuOpen); sfx.tick(); }} aria-label="Menu"><Menu size={13} /></button>
        </div>
      </header>

      {/* world bottom controls */}
      {phase === "world" ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg pv-panel px-3 py-2">
            <button className="pv-hud-btn" onClick={() => { setPaused(!paused); sfx.tick(); }} aria-label={paused ? "Resume" : "Pause"}>
              {paused ? <Play size={13} className="text-[#39f0c3]" /> : <Pause size={13} />}
              <span className="hidden sm:inline">{paused ? "Resume" : "Pause"}</span>
            </button>
            <button className="pv-hud-btn" onClick={() => { resetWorld(); sfx.launch(); }} aria-label="Reset experiment">
              <RotateCcw size={13} /> <span className="hidden sm:inline">Reset</span>
            </button>
            {paused ? <span className="num anim-blink text-[10px] uppercase tracking-[0.2em] text-[#ffb454]">Paused</span> : null}
          </div>
        </div>
      ) : null}

      {/* demo caption + skip */}
      <AnimatePresence>
        {demo ? (
          <motion.div key="demo" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            className="absolute inset-x-0 bottom-16 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
            {demoCaption ? (
              <div className="pv-panel max-w-xl rounded-lg px-5 py-2.5 text-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#ffb454]">EXPO DEMO</span>
                <p key={demoCaption} className="anim-fade-up mt-0.5 text-[13px] text-[#e9f1ff] sm:text-[14px]">{demoCaption}</p>
              </div>
            ) : null}
            <button onClick={() => { stopDemo(); sfx.tick(); }} className="pv-btn-ghost !px-4 !py-1.5 !text-[10px]">Skip Demo <X size={11} /></button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* menu sheet */}
      <AnimatePresence>
        {menuOpen ? (
          <motion.div key="menu" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="pv-panel-solid absolute right-3 top-16 z-40 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl p-4" role="dialog" aria-label="Menu">
            <div className="flex items-center justify-between">
              <span className="font-display text-[12px] font-bold uppercase tracking-[0.22em] text-[#53e8ff]">System Menu</span>
              <button onClick={() => setPanel("menuOpen", false)} aria-label="Close menu" className="text-[#5a6d94] hover:text-[#e9f1ff]"><X size={15} /></button>
            </div>
            <div className="mt-3 space-y-1.5">
              <button onClick={() => { startDemo(); }} className="flex w-full items-center gap-2.5 rounded-md border border-[rgba(255,180,84,0.3)] bg-[rgba(255,180,84,0.07)] px-3 py-2.5 text-left transition-colors hover:bg-[rgba(255,180,84,0.14)]">
                <Clapperboard size={15} className="text-[#ffb454]" />
                <div>
                  <div className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-[#ffb454]">Expo Demo Mode</div>
                  <div className="text-[10px] text-[#8fa3c8]">Guided ~2 min tour of the best experiments</div>
                </div>
              </button>
              <button onClick={() => openPanel("progressOpen")} className="flex w-full items-center gap-2.5 rounded-md border border-[rgba(96,145,255,0.14)] px-3 py-2 text-left text-[12px] text-[#aebfe0] hover:border-[rgba(83,232,255,0.4)] hover:text-[#53e8ff]">
                <Trophy size={14} /> Progress & achievements
              </button>
              <button onClick={() => openPanel("missionsOpen")} className="flex w-full items-center gap-2.5 rounded-md border border-[rgba(96,145,255,0.14)] px-3 py-2 text-left text-[12px] text-[#aebfe0] hover:border-[rgba(83,232,255,0.4)] hover:text-[#53e8ff]">
                <Target size={14} /> Physics missions
              </button>
              <button onClick={() => openPanel("phyxOpen")} className="flex w-full items-center gap-2.5 rounded-md border border-[rgba(96,145,255,0.14)] px-3 py-2 text-left text-[12px] text-[#aebfe0] hover:border-[rgba(83,232,255,0.4)] hover:text-[#53e8ff]">
                <Bot size={14} /> Ask PHY-X
              </button>
            </div>
            <div className="mt-3 rounded-md border border-[rgba(96,145,255,0.1)] bg-[rgba(7,11,22,0.6)] p-2.5">
              <div className="flex items-center gap-1.5 text-[#53e8ff]"><Info size={12} /><span className="label-xs">Controls</span></div>
              <ul className="mt-1.5 space-y-1 font-mono text-[10px] text-[#8fa3c8]">
                <li>Drag — rotate camera</li>
                <li>Scroll / pinch — zoom</li>
                <li>Click a world — enter it</li>
                <li>Esc — close panels</li>
              </ul>
            </div>
            <p className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-[#3a4a70]">
              Real equations • SI units • <Orbit size={9} className="inline" /> v1.0
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
