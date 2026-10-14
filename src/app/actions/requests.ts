"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOnboardedUser } from "@/lib/auth";
import { normalizeRol } from "@/lib/rol";
import { computeTotals, resolveRequirements } from "@/lib/requirements";
import { getOwnedRequest, markRequestPaid, withRequestNumber } from "@/lib/requests";
import { getPaymentProvider } from "@/lib/payments";
import type { FormState } from "./auth";

const newRequestSchema = z.object({
  procedure: z.enum(["INFORME_TITULO", "SANEAMIENTO"], { message: "Selecciona un trámite" }),
  regionId: z.coerce.number({ message: "Selecciona una región" }).int().positive("Selecciona una región"),
  comunaId: z.coerce.number({ message: "Selecciona una comuna" }).int().positive("Selecciona una comuna"),
  rol: z.string().trim().transform((v, ctx) => {
    const rol = normalizeRol(v);
    if (!rol) {
      ctx.addIssue({ code: "custom", message: "Formato de rol inválido, usa manzana-predio (ej. 1234-56)" });
      return z.NEVER;
    }
    return rol;
  }),
});

/** Pasos 4 a 8: crea la solicitud con todos los documentos requeridos marcados. */
export async function createRequest(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOnboardedUser();
  const parsed = newRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { procedure: code, regionId, comunaId, rol } = parsed.data;

  const comuna = await prisma.comuna.findUnique({ where: { id: comunaId } });
  if (!comuna || comuna.regionId !== regionId) return { fieldErrors: { comunaId: ["Comuna inválida"] } };

  const procedure = await prisma.procedure.findUniqueOrThrow({
    where: { code },
    include: { requirements: { include: { documentType: true } } },
  });
  const activeRows = procedure.requirements.filter((r) => r.documentType.active);
  const docIds = resolveRequirements(activeRows, regionId, comunaId);
  if (docIds.length === 0) return { error: "No hay documentos configurados para este trámite en esa comuna." };
  const priceById = new Map(activeRows.map((r) => [r.documentTypeId, r.documentType.price]));

  const items = docIds.map((id, sortOrder) => ({
    documentTypeId: id,
    price: priceById.get(id) ?? 0,
    selected: true,
    sortOrder,
  }));
  const totals = computeTotals(items, false, procedure.reportPrice);

  const request = await withRequestNumber((number) =>
    prisma.request.create({
      data: {
        number,
        userId: user.id,
        procedureId: procedure.id,
        comunaId,
        rol,
        ...totals,
        items: { create: items },
        events: { create: { type: "CREADA", message: "Solicitud creada." } },
      },
    }),
  );

  redirect(`/app/solicitudes/${request.id}/documentos`);
}

/** Pasos 9 a 12: guarda la selección de documentos e informe, y envía a pagar. */
export async function checkout(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOnboardedUser();
  const requestId = String(formData.get("requestId") ?? "");
  const request = await getOwnedRequest(requestId, user.id);
  if (request.status !== "BORRADOR" && request.status !== "PENDIENTE_PAGO") {
    redirect(`/app/solicitudes/${request.id}`);
  }

  const selectedIds = new Set(formData.getAll("documents").map(String));
  const includeReport = formData.get("includeReport") === "on";
  const items = request.items.map((i) => ({ id: i.id, price: i.price, selected: selectedIds.has(i.id) }));
  if (!items.some((i) => i.selected) && !includeReport) {
    return { error: "Selecciona al menos un documento." };
  }
  const totals = computeTotals(items, includeReport, request.procedure.reportPrice);

  await prisma.$transaction([
    ...items.map((i) => prisma.requestItem.update({ where: { id: i.id }, data: { selected: i.selected } })),
    prisma.request.update({
      where: { id: request.id },
      data: { includeReport, ...totals, status: "PENDIENTE_PAGO" },
    }),
  ]);

  // Todo gratuito: no pasa por la pasarela.
  if (totals.total === 0) {
    await markRequestPaid(request.id);
    redirect(`/app/solicitudes/${request.id}?confirmada=1`);
  }

  const provider = getPaymentProvider();
  const payment = await prisma.payment.create({
    data: { requestId: request.id, provider: provider.name, amount: totals.total },
  });
  const { redirectUrl, externalId } = await provider.createCheckout({
    paymentId: payment.id,
    amount: totals.total,
    description: `Solicitud #${request.number} - ${request.procedure.name}`,
    customerEmail: user.email,
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { externalId } });
  redirect(redirectUrl);
}
