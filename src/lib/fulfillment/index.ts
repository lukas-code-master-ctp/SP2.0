import { prisma } from "../db";
import { processRequest } from "./engine";

/**
 * Punto de entrada a la obtención de documentos (pasos 15 a 19).
 * Local: procesa en el mismo proceso del servidor, sin bloquear la respuesta.
 * Producción: publica un job por documento en la cola (BullMQ/Redis); ver docs/ARQUITECTURA.md.
 */
export async function enqueueFulfillment(requestId: string): Promise<void> {
  await prisma.requestEvent.create({
    data: { requestId, type: "EN_COLA", message: "Solicitud en cola para obtención de documentos." },
  });
  void processRequest(requestId).catch((e) => console.error(`[obtención] ${requestId}`, e));
}

export { processRequest, retryRequest } from "./engine";
