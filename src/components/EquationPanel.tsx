import { AnimatePresence, motion } from "framer-motion";
import { Calculator, X } from "lucide-react";
import { useStore } from "../store";
import { sfx } from "../sfx";

export default function EquationPanel() {
  const eq = useStore((s) => s.eq);
  const closeEq = useStore((s) => s.closeEq);
  return (
    <AnimatePresence>
      {eq ? (
        <motion.div
          key="eq"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(2,4,10,0.6)] p-4 backdrop-blur-[3px]"
          onClick={closeEq}
        >
          <motion.div
            initial={{ scale: 0.92, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="pv-panel-solid relative w-full max-w-lg overflow-hidden rounded-xl"
            role="dialog" aria-label={`Physics: ${eq.title}`}
          >
            <div className="flex items-center justify-between border-b border-[rgba(96,145,255,0.14)] px-5 py-3">
              <div className="flex items-center gap-2 text-[#53e8ff]">
                <Calculator size={15} />
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em]">The Physics — {eq.title}</span>
              </div>
              <button onClick={() => { closeEq(); sfx.tick(); }} aria-label="Close" className="rounded p-1 text-[#5a6d94] hover:text-[#e9f1ff]"><X size={16} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="rounded-lg border border-[rgba(83,232,255,0.25)] bg-[rgba(83,232,255,0.06)] px-4 py-3 text-center">
                <div className="num text-[22px] text-[#53e8ff]">{eq.formula}</div>
              </div>
              <div className="label-xs mt-4">Variables</div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {eq.vars.map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between rounded border border-[rgba(96,145,255,0.1)] bg-[rgba(7,11,22,0.6)] px-2.5 py-1.5">
                    <span className="num text-[12px] text-[#8fa3c8]">{k}</span>
                    <span className="num text-[12px] text-[#e9f1ff]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="label-xs mt-4">Calculation</div>
              <div className="mt-1.5 space-y-1.5">
                {eq.steps.map((s, i) => (
                  <motion.div
                    key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }}
                    className="eq-line num rounded-r px-3 py-1.5 text-[13px] text-[#c6d6f5]"
                  >
                    {s}
                  </motion.div>
                ))}
              </div>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + eq.steps.length * 0.12 }}
                className="mt-3 rounded-lg border border-[rgba(57,240,195,0.35)] bg-[rgba(57,240,195,0.08)] px-4 py-2.5 text-center"
              >
                <span className="num text-[18px] font-semibold text-[#39f0c3]">{eq.result}</span>
              </motion.div>
              {eq.note ? <p className="mt-3 text-center text-[11px] italic text-[#5a6d94]">{eq.note}</p> : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
