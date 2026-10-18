import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOnboardedUser } from "@/lib/auth";
import { formatCLP } from "@/lib/money";
import { Lock } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { MockCardForm } from "./MockCardForm";

export default async function MockGatewayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { request: { include: { procedure: true } } },
  });
  if (!payment || payment.request.userId !== user.id || payment.provider !== "mock") notFound();
  if (payment.status === "APROBADO") redirect(`/app/solicitudes/${payment.requestId}?confirmada=1`);

  return (
    <main id="contenido" className="mx-auto max-w-md px-4 py-12">
      <Logo className="mx-auto mb-8 h-8 w-auto" />
      <div className="mb-4 rounded-xl bg-amber-100 px-3 py-2 text-center text-xs font-medium text-amber-900">
        Pasarela de pago SIMULADA (desarrollo). En producción esta página es de Webpay/Flow.
      </div>
      <div className="card space-y-6">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-slate-500">
            <Lock className="h-3.5 w-3.5" aria-hidden /> Pagando a SmartProp
          </p>
          <p className="mt-1 text-4xl font-semibold tabular-nums text-brand-900">{formatCLP(payment.amount)}</p>
          <p className="mt-1 text-sm text-slate-600">
            Solicitud #{payment.request.number} · {payment.request.procedure.name}
          </p>
        </div>
        <MockCardForm paymentId={payment.id} />
      </div>
    </main>
  );
}
