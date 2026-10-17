import { prisma } from "../db";
import { drainQueue, startFulfillment } from "./engine";

/**
 * Punto de entrada a la obtención de documentos (pasos 15 a 19): crea un trabajo por documento en la cola.
 * Producción: los toma el motor (npm run worker), que corre en un servidor en Chile.
 * Local: con WORKER_INLINE=true el mismo servidor web procesa la cola, sin levantar el motor aparte.
 */
export async function enqueueFulfillment(requestId: string): Promise<void> {
  await prisma.requestEvent.create({
    data: { requestId, type: "EN_COLA", message: "Solicitud en cola para obtención de documentos." },
  });
  await startFulfillment(requestId);
  kickInlineWorker();
}

/** Vuelve a poner en cola los documentos con problemas. */
export async function retryFulfillment(requestId: string): Promise<void> {
  await startFulfillment(requestId);
  kickInlineWorker();
}

function kickInlineWorker() {
  if (process.env.WORKER_INLINE === "true") void drainQueue().catch((e) => console.error("[motor]", e));
}
