import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { getOwnedRequest } from "@/lib/requests";
import { formatCLP } from "@/lib/money";
import { ITEM_STATUS_LABEL, REQUEST_STATUS_LABEL } from "@/lib/labels";
import { Steps } from "@/components/Steps";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SubmitButton } from "@/components/ui";
import { retryFulfillment } from "@/app/actions/fulfillment";

const ITEM_STATUS_STYLE = {
  PENDIENTE: "bg-slate-100 text-slate-600",
  OBTENIENDO: "bg-amber-100 text-amber-800",
  OBTENIDO: "bg-emerald-100 text-emerald-800",
  REQUIERE_ACCION: "bg-sky-100 text-sky-800",
  FALLIDO: "bg-amber-100 text-amber-800",
} as const;

export default async function RequestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmada?: string }>;
}) {
  const [{ id }, { confirmada }] = await Promise.all([params, searchParams]);
  const user = await requireOnboardedUser();
  const r = await getOwnedRequest(id, user.id);
  const selectedItems = r.items.filter((i) => i.selected);
  const paidOrLater = r.status !== "BORRADOR" && r.status !== "PENDIENTE_PAGO" && r.status !== "CANCELADA";
  const fetching = r.status === "PAGADA" || r.status === "EN_PROCESO";
  const working = fetching && selectedItems.some((i) => ["PENDIENTE", "OBTENIENDO", "FALLIDO"].includes(i.status));
  const canRetry = fetching && !working && selectedItems.some((i) => i.status !== "OBTENIDO");

  return (
    <>
      {working && <AutoRefresh />}
      {confirmada && paidOrLater && (
        <>
          <Steps current={3} />
          <div className="card mb-8 border-emerald-200 bg-emerald-50">
            <h1 className="text-xl font-bold text-emerald-800">¡Listo! Tu solicitud #{r.number} está en proceso.</h1>
            <p className="mt-2 text-emerald-900">
              Ya estamos gestionando los documentos. Te enviaremos un correo a <strong>{user.email}</strong> apenas
              esté todo listo{r.includeReport ? `, junto con el ${r.procedure.reportName.toLowerCase()}` : ""}.
            </p>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Solicitud #{r.number}</h2>
          <p className="mt-1 text-slate-600">
            {r.procedure.name} · Rol {r.rol}, {r.comuna.name}, {r.comuna.region.name}
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          {REQUEST_STATUS_LABEL[r.status]}
        </span>
      </div>

      {!paidOrLater && r.status !== "CANCELADA" && (
        <Link href={`/app/solicitudes/${r.id}/documentos`} className="btn-primary mt-6">Continuar con el pago</Link>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <section className="card p-0">
          <h3 className="border-b border-slate-200 px-6 py-4 font-semibold">Documentos</h3>
          <ul className="divide-y divide-slate-100">
            {selectedItems.map((i) => (
              <li key={i.id} className="flex items-start justify-between gap-4 px-6 py-3 text-sm">
                <div>
                  {i.filePath ? (
                    <a href={`/app/solicitudes/${r.id}/archivos/${i.id}`} target="_blank" className="font-medium text-brand-700 hover:underline">
                      {i.documentType.name}
                    </a>
                  ) : (
                    <span>{i.documentType.name}</span>
                  )}
                  {i.detail && <p className="mt-0.5 text-xs text-slate-500">{i.detail}</p>}
                </div>
                <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${ITEM_STATUS_STYLE[i.status]}`}>
                  {ITEM_STATUS_LABEL[i.status]}
                </span>
              </li>
            ))}
            {r.includeReport && (
              <li className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
                <span className="font-medium">{r.procedure.reportName}</span>
                <span className="text-slate-500">{r.status === "COMPLETADA" ? "Listo" : "Pendiente"}</span>
              </li>
            )}
          </ul>
          {canRetry && (
            <form action={retryFulfillment} className="border-t border-slate-200 px-6 py-4">
              <input type="hidden" name="requestId" value={r.id} />
              <SubmitButton>Reintentar documentos pendientes</SubmitButton>
            </form>
          )}
        </section>

        <aside className="space-y-6">
          <div className="card space-y-2 text-sm">
            <h3 className="font-semibold">Pago</h3>
            <div className="flex justify-between"><span>Documentos</span><span>{formatCLP(r.documentsTotal)}</span></div>
            {r.includeReport && (
              <div className="flex justify-between"><span>Informe</span><span>{formatCLP(r.reportTotal)}</span></div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
              <span>Total</span><span>{r.total === 0 ? "$0" : formatCLP(r.total)}</span>
            </div>
          </div>
          <div className="card text-sm">
            <h3 className="mb-3 font-semibold">Historial</h3>
            <ol className="space-y-2">
              {r.events.map((e) => (
                <li key={e.id}>
                  <p>{e.message}</p>
                  <p className="text-xs text-slate-500">{e.createdAt.toLocaleString("es-CL")}</p>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </>
  );
}
