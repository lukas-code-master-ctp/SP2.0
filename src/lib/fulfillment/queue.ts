import type { Job } from "@prisma/client";
import { prisma } from "../db";

// Cola de trabajos sobre Postgres. Varios workers pueden tomar trabajos en paralelo sin pisarse.
const STALE_LOCK_MINUTES = 10;

export async function enqueueDocumentJobs(requestId: string, itemIds: string[]) {
  if (itemIds.length === 0) return;
  await prisma.job.createMany({
    data: itemIds.map((itemId) => ({ type: "OBTENER_DOCUMENTO", requestId, itemId })),
  });
}

/** Toma el siguiente trabajo disponible (o uno abandonado por un worker caído) y lo marca EN_CURSO. */
export async function claimNextJob(): Promise<Job | null> {
  const staleBefore = new Date(Date.now() - STALE_LOCK_MINUTES * 60_000);
  const rows = await prisma.$queryRaw<Job[]>`
    UPDATE "Job" SET status = 'EN_CURSO', "lockedAt" = now(), attempts = attempts + 1, "updatedAt" = now()
    WHERE id = (
      SELECT id FROM "Job"
      WHERE (status = 'PENDIENTE' AND "runAt" <= now())
         OR (status = 'EN_CURSO' AND "lockedAt" < ${staleBefore})
      ORDER BY "runAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *`;
  return rows[0] ?? null;
}

export async function completeJob(id: string) {
  await prisma.job.update({ where: { id }, data: { status: "LISTO", lockedAt: null } });
}

export async function retryJobLater(id: string, error: string, delayMs: number) {
  await prisma.job.update({
    where: { id },
    data: { status: "PENDIENTE", lockedAt: null, lastError: error, runAt: new Date(Date.now() + delayMs) },
  });
}

export async function failJob(id: string, error: string) {
  await prisma.job.update({ where: { id }, data: { status: "FALLIDO", lockedAt: null, lastError: error } });
}
