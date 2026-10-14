import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireOnboardedUser } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { REQUEST_STATUS_LABEL } from "@/lib/labels";

export default async function Dashboard() {
  const user = await requireOnboardedUser();
  const requests = await prisma.request.findMany({
    where: { userId: user.id },
    include: { procedure: true, comuna: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Mis solicitudes</h1>
        <Link href="/app/tramites/nuevo" className="btn-primary">+ Iniciar trámite</Link>
      </div>

      {requests.length === 0 ? (
        <div className="card mt-8 text-center">
          <p className="text-slate-600">Aún no tienes solicitudes.</p>
          <Link href="/app/tramites/nuevo" className="btn-primary mt-4">Iniciar mi primer trámite</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {requests.map((r) => {
            const href =
              r.status === "BORRADOR" || r.status === "PENDIENTE_PAGO"
                ? `/app/solicitudes/${r.id}/documentos`
                : `/app/solicitudes/${r.id}`;
            return (
              <li key={r.id}>
                <Link href={href} className="card flex flex-wrap items-center justify-between gap-2 hover:border-brand-500">
                  <div>
                    <p className="font-semibold">#{r.number} · {r.procedure.name}</p>
                    <p className="text-sm text-slate-600">Rol {r.rol}, {r.comuna.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{REQUEST_STATUS_LABEL[r.status]}</p>
                    <p className="text-sm text-slate-500">{formatCLP(r.total)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
