"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cx } from "@/lib/cx";

const STEPS = ["Trámite y propiedad", "Documentos", "Pago", "En proceso"];

export function Steps({ current }: { current: number }) {
  return (
    <nav aria-label="Progreso" className="mb-10">
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={s} aria-current={active ? "step" : undefined} className="min-w-0">
              <div className="h-1.5 overflow-hidden rounded-full bg-cloud">
                <motion.div
                  className="h-full origin-left rounded-full bg-grad-light"
                  initial={{ scaleX: done ? 1 : 0 }}
                  animate={{ scaleX: done || active ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: active ? 0.15 : 0 }}
                />
              </div>
              <div className={cx("mt-2 flex items-center gap-1.5 text-xs", active ? "font-semibold text-brand-900" : done ? "text-brand-500" : "text-slate-400")}>
                <span
                  className={cx(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                    done ? "bg-brand-500 text-white" : active ? "bg-brand-900 text-white" : "bg-cloud text-slate-500",
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className="hidden truncate sm:inline">{s}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-xs text-slate-500 sm:hidden">
        Paso {current + 1} de {STEPS.length}: {STEPS[current]}
      </p>
    </nav>
  );
}
