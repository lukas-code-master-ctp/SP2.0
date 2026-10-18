"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Landmark, Sparkles } from "lucide-react";
import { checkout } from "@/app/actions/requests";
import { FormError, SubmitButton, cx } from "@/components/ui";
import { formatCLP } from "@/lib/money";
import { computeTotals } from "@/lib/requirements";

type Item = { id: string; name: string; description: string; issuer: string; price: number; selected: boolean };
type Props = { requestId: string; items: Item[]; report: { name: string; price: number; included: boolean } };

export function DocumentSelection({ requestId, items, report }: Props) {
  const [state, action] = useActionState(checkout, undefined);
  const [selected, setSelected] = useState(() => new Set(items.filter((i) => i.selected).map((i) => i.id)));
  const [includeReport, setIncludeReport] = useState(report.included);

  const totals = computeTotals(
    items.map((i) => ({ price: i.price, selected: selected.has(i.id) })),
    includeReport,
    report.price,
  );
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = selected.size === items.length;

  return (
    <form action={action} className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="requestId" value={requestId} />

      <div className="space-y-6">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-cloud px-5 py-3 sm:px-6">
            <p className="text-sm tabular-nums text-slate-600">
              {selected.size} de {items.length} documentos seleccionados
            </p>
            <button
              type="button"
              className="btn-ghost -mr-3 text-brand-500"
              onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
            >
              {allSelected ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>
          <ul className="divide-y divide-cloud">
            {items.map((i) => {
              const on = selected.has(i.id);
              return (
                <li key={i.id}>
                  <label className={cx("flex cursor-pointer items-start gap-4 px-5 py-4 transition-colors sm:px-6", on ? "bg-brand-50/40" : "hover:bg-mist")}>
                    <input
                      type="checkbox"
                      name="documents"
                      value={i.id}
                      checked={on}
                      onChange={() => toggle(i.id)}
                      className="peer sr-only"
                    />
                    <CheckMark on={on} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-brand-900">{i.name}</span>
                      <span className="block text-sm text-slate-600">{i.description}</span>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500">
                        <Landmark className="h-3.5 w-3.5" aria-hidden /> {i.issuer}
                      </span>
                    </span>
                    <span className={cx("whitespace-nowrap text-sm font-semibold tabular-nums", i.price === 0 ? "text-emerald-600" : "text-brand-900")}>
                      {formatCLP(i.price)}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>

        <label
          className={cx(
            "card flex cursor-pointer items-start gap-4 transition duration-200",
            includeReport ? "border-brand-500 ring-4 ring-brand-100" : "card-interactive",
          )}
        >
          <input
            type="checkbox"
            name="includeReport"
            checked={includeReport}
            onChange={(e) => setIncludeReport(e.target.checked)}
            className="peer sr-only"
          />
          <CheckMark on={includeReport} />
          <span className="flex-1">
            <span className="flex items-center gap-2 font-semibold text-brand-900">Agregar {report.name.toLowerCase()} <Sparkles className="h-4 w-4 text-brand-500" aria-hidden /></span>
            <span className="block text-sm text-slate-600">
              Con los documentos obtenidos redactamos el {report.name.toLowerCase()} con asistencia de IA, listo para revisión de un abogado.
            </span>
          </span>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-brand-900">{formatCLP(report.price)}</span>
        </label>
      </div>

      <aside className="card h-fit space-y-3 lg:sticky lg:top-24">
        <h2 className="font-semibold text-brand-900">Resumen</h2>
        <div className="flex justify-between text-sm">
          <span>Documentos ({selected.size})</span>
          <span className="tabular-nums">{formatCLP(totals.documentsTotal)}</span>
        </div>
        {includeReport && (
          <div className="flex justify-between text-sm">
            <span>{report.name}</span>
            <span className="tabular-nums">{formatCLP(totals.reportTotal)}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-cloud pt-3">
          <span className="font-semibold text-brand-900">Total</span>
          <span className="relative overflow-hidden text-2xl font-semibold tabular-nums text-brand-900" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={totals.total}
                className="block"
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -16, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {totals.total === 0 ? "$0" : formatCLP(totals.total)}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
        <FormError message={state?.error} />
        <SubmitButton className="w-full" disabled={selected.size === 0 && !includeReport}>
          {totals.total === 0 ? "Confirmar solicitud" : "Ir a pagar"} <ArrowRight className="h-4 w-4" aria-hidden />
        </SubmitButton>
        <p className="text-xs text-slate-500">Valores en pesos chilenos, incluyen derechos de emisión y gestión.</p>
      </aside>
    </form>
  );
}

/** Casilla visual; el input real (sr-only, clase "peer") va justo antes y recibe el foco. */
function CheckMark({ on }: { on: boolean }) {
  return (
    <span
      className={cx(
        "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-brand-200",
        on ? "border-brand-500 bg-brand-500 text-white" : "border-slate-300 bg-white",
      )}
      aria-hidden
    >
      <AnimatePresence initial={false}>
        {on && (
          <motion.span className="block" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 30 }}>
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
