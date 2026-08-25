import { useState } from "react";
import { Trophy, Lock, Award } from "lucide-react";
import { useStore, ACHIEVEMENTS, levelFor, WORLDS } from "../store";
import { Sheet, Btn } from "./ui";

export default function ProgressPanel() {
  const open = useStore((s) => s.progressOpen);
  const setPanel = useStore((s) => s.setPanel);
  const xp = useStore((s) => s.xp);
  const visited = useStore((s) => s.visited);
  const missionsDone = useStore((s) => s.missionsDone);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!open) return null;

  const level = levelFor(xp);
  const into = xp - (level - 1) * 400;
  const prog = { xp, visited, missionsDone };

  return (
    <Sheet title="Pilot Progress" icon={<Trophy size={14} className="text-[#ffb454]" />} accent="#ffb454" onClose={() => setPanel("progressOpen", false)}>
      <div className="rounded-lg border border-[rgba(83,232,255,0.2)] bg-[rgba(83,232,255,0.05)] p-3">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[13px] font-bold uppercase tracking-[0.2em] text-[#53e8ff]">Level {level}</span>
          <span className="num text-[11px] text-[#8fa3c8]">{xp} XP</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(96,145,255,0.12)]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#53e8ff] to-[#39f0c3] transition-all duration-700" style={{ width: `${Math.min(100, (into / 400) * 100)}%` }} />
        </div>
        <div className="mt-1 text-right font-mono text-[9px] uppercase tracking-[0.16em] text-[#5a6d94]">{400 - into} XP to level {level + 1}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-md border border-[rgba(96,145,255,0.12)] bg-[rgba(7,11,22,0.6)] p-2 text-center">
          <div className="num text-[18px] text-[#53e8ff]">{visited.length}<span className="text-[11px] text-[#5a6d94]">/6</span></div>
          <div className="label-xs !text-[8px]">Worlds</div>
        </div>
        <div className="rounded-md border border-[rgba(96,145,255,0.12)] bg-[rgba(7,11,22,0.6)] p-2 text-center">
          <div className="num text-[18px] text-[#ffb454]">{missionsDone.length}<span className="text-[11px] text-[#5a6d94]">/5</span></div>
          <div className="label-xs !text-[8px]">Missions</div>
        </div>
        <div className="rounded-md border border-[rgba(96,145,255,0.12)] bg-[rgba(7,11,22,0.6)] p-2 text-center">
          <div className="num text-[18px] text-[#39f0c3]">
            {WORLDS.filter((w) => visited.includes(w.id)).reduce((a, w) => a + w.experiments.length, 0)}
            <span className="text-[11px] text-[#5a6d94]">/{WORLDS.reduce((a, w) => a + w.experiments.length, 0)}</span>
          </div>
          <div className="label-xs !text-[8px]">Experiments</div>
        </div>
      </div>

      <div className="label-xs mt-4">Worlds explored</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {WORLDS.map((w) => {
          const v = visited.includes(w.id);
          return (
            <span key={w.id} className="num rounded border px-2 py-0.5 text-[10px] uppercase tracking-wider"
              style={v ? { color: w.color, borderColor: `${w.color}55`, background: `${w.color}14` } : { color: "#5a6d94", borderColor: "rgba(96,145,255,0.12)" }}>
              {w.name}
            </span>
          );
        })}
      </div>

      <div className="label-xs mt-4">Achievements</div>
      <div className="mt-1.5 space-y-1.5">
        {ACHIEVEMENTS.map((a) => {
          const un = a.check(prog);
          return (
            <div key={a.id} className={`flex items-center gap-2.5 rounded-md border px-2.5 py-2 ${un ? "border-[rgba(255,180,84,0.35)] bg-[rgba(255,180,84,0.06)]" : "border-[rgba(96,145,255,0.1)] bg-[rgba(7,11,22,0.5)]"}`}>
              {un ? <Award size={16} className="shrink-0 text-[#ffb454]" /> : <Lock size={15} className="shrink-0 text-[#3a4a70]" />}
              <div className="min-w-0">
                <div className={`truncate text-[12px] font-semibold ${un ? "text-[#e9f1ff]" : "text-[#5a6d94]"}`}>{a.name}</div>
                <div className="truncate text-[10px] text-[#5a6d94]">{a.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4">
        {!confirmReset ? (
          <Btn variant="ghost" className="w-full !py-2 !text-[10px]" onClick={() => setConfirmReset(true)}>Reset all progress</Btn>
        ) : (
          <div className="flex gap-2">
            <Btn variant="warn" className="flex-1 !py-2 !text-[10px]" onClick={() => {
              try { localStorage.removeItem("physicsverse-save-v1"); } catch { /* noop */ }
              window.location.reload();
            }}>Confirm reset</Btn>
            <Btn variant="ghost" className="flex-1 !py-2 !text-[10px]" onClick={() => setConfirmReset(false)}>Cancel</Btn>
          </div>
        )}
      </div>
    </Sheet>
  );
}
