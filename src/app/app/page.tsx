import Link from "next/link";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireOnboardedUser } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { Logo } from "@/components/brand/Logo";
import { RequestStatusBadge } from "@/components/StatusBadge";
import { Stagger, StaggerItem } from "@/components/motion/Reveal";
import { DeleteRequestButton } from "@/components/DeleteRequestButton";

export default async function Dashboard() {
  const user = await requireOnboardedUser();
  const requests = await prisma.request.findMany({
    where: { userId: user.id, deletedAt: null },
    include: { procedure: true, comuna: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Tu carpeta legal</p>
          <h1 className="title mt-2">Mis solicitudes</h1>
        </div>
        <Link href="/app/tramites/nuevo" className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden /> Iniciar trámite
        </Link>
      </div>

      {requests.length === 0 ? (
        <div className="card mt-10 flex flex-col items-center px-6 py-14 text-center">
          <Logo variant="iso" className="h-16 w-auto" title="" />
          <h2 className="mt-6 text-lg font-semibold text-brand-900">Aún no tienes solicitudes</h2>
          <p className="mt-2 max-w-sm text-sm text-slate-600">
            Inicia un trámite y reunimos por ti los certificados de la propiedad en un solo lugar.
          </p>
          <Link href="/app/tramites/nuevo" className="btn-primary mt-6">Iniciar mi primer trámite</Link>
        </div>
      ) : (
        <Stagger as="ul" className="mt-8 space-y-3">
          {requests.map((r) => {
            const href =
              r.status === "BORRADOR" || r.status === "PENDIENTE_PAGO"
                ? `/app/solicitudes/${r.id}/documentos`
                : `/app/solicitudes/${r.id}`;
            return (
              <StaggerItem as="li" key={r.id} className="relative">
                <Link href={href} className="card card-interactive group flex items-center gap-4 p-4 pr-16 sm:p-5 sm:pr-16">
                  <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500 sm:grid">
                    <FileText className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-brand-900">
                      <span className="tabular-nums text-slate-400">#{r.number}</span> {r.procedure.name}
                    </p>
                    <p className="truncate text-sm text-slate-600">Rol {r.rol}, {r.comuna.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <RequestStatusBadge status={r.status} />
                    <p className="text-sm font-medium tabular-nums text-slate-600">{formatCLP(r.total)}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" aria-hidden />
                </Link>
                <DeleteRequestButton
                  requestId={r.id}
                  number={r.number}
                  fetching={r.status === "PAGADA" || r.status === "EN_PROCESO"}
                  compact
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                />
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </>
  );
}
