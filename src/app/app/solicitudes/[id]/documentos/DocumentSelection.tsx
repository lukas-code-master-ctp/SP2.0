"use client";

import { useActionState, useState } from "react";
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
        <div className="card p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-600">
              {selected.size} de {items.length} documentos seleccionados
            </p>
            <button
              type="button"
              className="text-sm font-medium text-brand-600"
              onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
            >
              {allSelected ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>
          <ul className="divide-y divide-slate-100">
            {items.map((i) => (
              <li key={i.id}>
                <label className="flex cursor-pointer items-start gap-4 px-6 py-4 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    name="documents"
                    value={i.id}
                    checked={selected.has(i.id)}
                    onChange={() => toggle(i.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600"
                  />
                  <span className="flex-1">
                    <span className="block font-medium">{i.name}</span>
                    <span className="block text-sm text-slate-600">{i.description}</span>
                    <span className="mt-1 block text-xs text-slate-500">Emite: {i.issuer}</span>
                  </span>
                  <span className={cx("whitespace-nowrap text-sm font-semibold", i.price === 0 && "text-emerald-600")}>
                    {formatCLP(i.price)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <label className={cx("card flex cursor-pointer items-start gap-4", includeReport && "border-brand-500 ring-2 ring-brand-100")}>
          <input
            type="checkbox"
            name="includeReport"
            checked={includeReport}
            onChange={(e) => setIncludeReport(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600"
          />
          <span className="flex-1">
            <span className="block font-semibold">Agregar {report.name.toLowerCase()}</span>
            <span className="block text-sm text-slate-600">
              Con los documentos obtenidos redactamos el {report.name.toLowerCase()} con asistencia de IA, listo para revisión de un abogado.
            </span>
          </span>
          <span className="whitespace-nowrap text-sm font-semibold">{formatCLP(report.price)}</span>
        </label>
      </div>

      <aside className="card h-fit space-y-3 lg:sticky lg:top-6">
        <h2 className="font-semibold">Resumen</h2>
        <div className="flex justify-between text-sm">
          <span>Documentos ({selected.size})</span>
          <span>{formatCLP(totals.documentsTotal)}</span>
        </div>
        {includeReport && (
          <div className="flex justify-between text-sm">
            <span>{report.name}</span>
            <span>{formatCLP(totals.reportTotal)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-3 font-semibold">
          <span>Total</span>
          <span>{totals.total === 0 ? "$0" : formatCLP(totals.total)}</span>
        </div>
        <FormError message={state?.error} />
        <SubmitButton className="w-full" disabled={selected.size === 0 && !includeReport}>
          {totals.total === 0 ? "Confirmar solicitud" : "Ir a pagar"}
        </SubmitButton>
        <p className="text-xs text-slate-500">Valores en pesos chilenos, incluyen derechos de emisión y gestión.</p>
      </aside>
    </form>
  );
}
