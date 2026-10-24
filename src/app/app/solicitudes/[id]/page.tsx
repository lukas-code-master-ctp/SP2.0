import Link from "next/link";
import { requireOnboardedUser } from "@/lib/auth";
import { getOwnedRequest } from "@/lib/requests";
import { formatCLP } from "@/lib/money";
import { ArrowRight, Download, FileText, Sparkles } from "lucide-react";
import { ItemStatusBadge, RequestStatusBadge } from "@/components/StatusBadge";
import { SuccessCheck } from "@/components/motion/SuccessCheck";
import { summarize, summarizeEvent } from "@/lib/summary";
import { Steps } from "@/components/Steps";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SubmitButton } from "@/components/ui";
import { retryFulfillment } from "@/app/actions/fulfillment";
import { DeleteRequestButton } from "@/components/DeleteRequestButton";

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
  const canRetry =
    fetching && !selectedItems.some((i) => i.status === "OBTENIENDO") && selectedItems.some((i) => i.status !== "OBTENIDO");

  return (
    <>
      {working && <AutoRefresh />}
      {confirmada && paidOrLater && (
        <>
          <Steps current={3} />
          <div className="relative mb-10 overflow-hidden rounded-[2rem] bg-grad-hero p-6 text-white shadow-lift sm:flex sm:items-center sm:gap-6 sm:p-8">
            <SuccessCheck />
            <div className="mt-4 sm:mt-0">
            <h1 className="text-xl font-semibold sm:text-2xl">¡Listo! Tu solicitud #{r.number} está en proceso.</h1>
            <p className="mt-2 text-white/85">
              Ya estamos gestionando los documentos. Te enviaremos un correo a <strong>{user.email}</strong> apenas
              esté todo listo{r.includeReport ? `, junto con el ${r.procedure.reportName.toLowerCase()}` : ""}.
            </p>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Solicitud #{r.number}</p>
          <h2 className="title mt-2">{r.procedure.name}</h2>
          <p className="mt-1 text-slate-600">
            Rol {r.rol}, {r.comuna.name}, {r.comuna.region.name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RequestStatusBadge status={r.status} />
          <DeleteRequestButton requestId={r.id} number={r.number} fetching={fetching} />
        </div>
      </div>

      {!paidOrLater && r.status !== "CANCELADA" && (
        <Link href={`/app/solicitudes/${r.id}/documentos`} className="btn-primary mt-6">Continuar con el pago <ArrowRight className="h-4 w-4" aria-hidden /></Link>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="card h-fit overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-cloud px-5 py-4 sm:px-6">
            <h3 className="font-semibold text-brand-900">Documentos</h3>
            <span className="text-xs tabular-nums text-slate-500">
              {selectedItems.filter((i) => i.status === "OBTENIDO").length} de{" "}
              {selectedItems.filter((i) => i.status !== "NO_APLICA").length} obtenidos
            </span>
          </div>
          <ul className="divide-y divide-cloud">
            {selectedItems.map((i) => (
              <li key={i.id} className="flex items-start gap-3 px-5 py-4 text-sm sm:px-6">
                <span className="mt-0.5 hidden h-9 w-9 shrink-0 place-items-center rounded-lg bg-mist text-brand-500 sm:grid">
                  <FileText className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  {i.filePath ? (
                    <a href={`/app/solicitudes/${r.id}/archivos/${i.id}`} target="_blank" className="inline-flex items-center gap-1.5 font-medium text-brand-500 hover:underline">
                      {i.documentType.name} <Download className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  ) : (
                    <span className="font-medium text-brand-900">{i.documentType.name}</span>
                  )}
                  {i.detail && <p className="mt-0.5 text-xs text-slate-500">{summarize(i.detail)}</p>}
                </div>
                <ItemStatusBadge status={i.status} />
              </li>
            ))}
            {r.includeReport && (
              <li className="flex items-center justify-between gap-4 px-5 py-4 text-sm sm:px-6">
                <span className="inline-flex items-center gap-2 font-medium text-brand-900">
                  <Sparkles className="h-4 w-4 text-brand-500" aria-hidden /> {r.procedure.reportName}
                </span>
                <span className="text-slate-500">{r.status === "COMPLETADA" ? "Listo" : "Pendiente"}</span>
              </li>
            )}
          </ul>
          {canRetry && (
            <form action={retryFulfillment} className="border-t border-cloud px-5 py-4 sm:px-6">
              <input type="hidden" name="requestId" value={r.id} />
              <SubmitButton>Obtener documentos pendientes</SubmitButton>
            </form>
          )}
        </section>

        <aside className="space-y-6">
          <div className="card space-y-2 text-sm">
            <h3 className="font-semibold text-brand-900">Pago</h3>
            <div className="flex justify-between"><span>Documentos</span><span>{formatCLP(r.documentsTotal)}</span></div>
            {r.includeReport && (
              <div className="flex justify-between"><span>Informe</span><span>{formatCLP(r.reportTotal)}</span></div>
            )}
            <div className="flex justify-between border-t border-cloud pt-2 font-semibold text-brand-900">
              <span>Total</span><span>{r.total === 0 ? "$0" : formatCLP(r.total)}</span>
            </div>
          </div>
          <div className="card text-sm">
            <h3 className="mb-4 font-semibold text-brand-900">Historial</h3>
            <ol className="relative space-y-4 border-l border-cloud pl-5">
              {r.events.map((e, idx) => (
                <li key={e.id} className="relative">
                  <span
                    className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${idx === 0 ? "bg-brand-500" : "bg-cloud"}`}
                    aria-hidden
                  />
                  <p className="break-words text-slate-700">{summarizeEvent(e.message)}</p>
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
