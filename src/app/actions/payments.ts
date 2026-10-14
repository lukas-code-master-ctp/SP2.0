"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOnboardedUser } from "@/lib/auth";
import { mockAuthorize } from "@/lib/payments/mock";
import { markRequestPaid } from "@/lib/requests";
import type { FormState } from "./auth";

const cardSchema = z.object({
  holder: z.string().trim().min(3, "Ingresa el nombre del titular"),
  number: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 13 && v.length <= 19, "Número de tarjeta inválido"),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Usa el formato MM/AA"),
  cvv: z.string().trim().regex(/^\d{3,4}$/, "CVV inválido"),
});

/**
 * Paso 13 con la pasarela SIMULADA. En producción esta pantalla y esta lógica viven en el proveedor
 * (Webpay/Flow): nuestra app solo recibe la confirmación. Aquí nunca se persiste el número de tarjeta.
 */
export async function payWithMock(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOnboardedUser();
  const payment = await prisma.payment.findUnique({
    where: { id: String(formData.get("paymentId") ?? "") },
    include: { request: true },
  });
  if (!payment || payment.request.userId !== user.id || payment.provider !== "mock") redirect("/app");
  if (payment.status === "APROBADO") redirect(`/app/solicitudes/${payment.requestId}?confirmada=1`);

  const parsed = cardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const approved = mockAuthorize(parsed.data.number);
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: approved ? "APROBADO" : "RECHAZADO", cardLast4: parsed.data.number.slice(-4) },
  });

  if (!approved) {
    await prisma.requestEvent.create({
      data: { requestId: payment.requestId, type: "PAGO_RECHAZADO", message: "El pago fue rechazado." },
    });
    return { error: "El pago fue rechazado por el emisor. Intenta con otra tarjeta." };
  }

  await markRequestPaid(payment.requestId);
  redirect(`/app/solicitudes/${payment.requestId}?confirmada=1`);
}
