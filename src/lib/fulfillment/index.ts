import { prisma } from "../db";

/**
 * Punto de entrada a la obtención de documentos (pasos 15 a 19).
 * MVP: solo registra que la solicitud quedó en cola.
 * Fase 2: publica un job en la cola (BullMQ/Redis) que procesa el orquestador de agentes;
 * ver docs/ARQUITECTURA.md.
 */
export async function enqueueFulfillment(requestId: string): Promise<void> {
  await prisma.requestEvent.create({
    data: { requestId, type: "EN_COLA", message: "Solicitud en cola para obtención de documentos." },
  });
}
