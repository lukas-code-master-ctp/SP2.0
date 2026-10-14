import "server-only";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { requestReceivedEmail, sendEmail } from "./email";
import { enqueueFulfillment } from "./fulfillment";

const FIRST_NUMBER = 1001;

async function nextRequestNumber(): Promise<number> {
  const last = await prisma.request.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return last ? last.number + 1 : FIRST_NUMBER;
}

/** Ejecuta `create` con el siguiente correlativo, reintentando si otra solicitud tomó el mismo número. */
export async function withRequestNumber<T>(create: (number: number) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await create(await nextRequestNumber());
    } catch (e) {
      const isUniqueViolation = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (!isUniqueViolation || attempt >= 4) throw e;
    }
  }
}

/** Carga una solicitud verificando que pertenezca al usuario. */
export async function getOwnedRequest(requestId: string, userId: string) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      procedure: true,
      comuna: { include: { region: true } },
      items: { include: { documentType: true }, orderBy: { sortOrder: "asc" } },
      events: { orderBy: { createdAt: "desc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!request || request.userId !== userId) notFound();
  return request;
}

/** Pago confirmado (o solicitud sin costo): pasa a PAGADA, avisa al cliente y encola la obtención. */
export async function markRequestPaid(requestId: string) {
  const request = await prisma.request.update({
    where: { id: requestId },
    data: { status: "PAGADA" },
    include: { user: true },
  });
  await prisma.requestEvent.create({
    data: { requestId, type: "PAGADA", message: "Pago confirmado. La solicitud está en proceso." },
  });
  await sendEmail(requestReceivedEmail(request.user.email, request.number, request.id));
  await enqueueFulfillment(requestId);
}
