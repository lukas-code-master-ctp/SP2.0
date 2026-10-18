import type { Job } from "@prisma/client";
import { prisma } from "../db";
import { requestReadyEmail, sendEmail } from "../email";
import { requestFolder, saveFile } from "../storage";
import { claimNextJob, completeJob, enqueueDocumentJobs, failJob, retryJobLater } from "./queue";
import { runExplorerAgent } from "./agent/explorer";
import { connectorFor } from "./registry";
import type { Connector, ConnectorResult, PropertyRef } from "./types";

export const MAX_ATTEMPTS = 3;
const CONNECTOR_TIMEOUT_MS = 3 * 60_000;
// El agente navega paso a paso con un modelo de IA, así que le damos más margen que a un conector fijo.
const AGENT_TIMEOUT_MS = 10 * 60_000;
const RETRY_DELAY_MS = 30_000;

async function event(requestId: string, type: string, message: string) {
  await prisma.requestEvent.create({ data: { requestId, type, message } });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Tiempo agotado (${ms / 1000}s)`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Deja la solicitud en proceso y crea un trabajo por cada documento pendiente. */
export async function startFulfillment(requestId: string): Promise<void> {
  const request = await prisma.request.findUniqueOrThrow({
    where: { id: requestId },
    include: { items: { where: { selected: true, status: { not: "OBTENIDO" } } } },
  });
  if (!["PAGADA", "EN_PROCESO"].includes(request.status)) return;

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "EN_PROCESO", folderPath: request.folderPath ?? requestFolder(request.number) },
  });
  if (request.status === "PAGADA") await event(requestId, "EN_PROCESO", "Comenzamos a obtener los documentos.");

  // No duplicar trabajos de documentos que ya están en la cola.
  const queued = await prisma.job.findMany({
    where: { requestId, status: { in: ["PENDIENTE", "EN_CURSO"] } },
    select: { itemId: true },
  });
  const queuedIds = new Set(queued.map((j) => j.itemId));
  const toQueue = request.items.filter((i) => !queuedIds.has(i.id));
  await prisma.requestItem.updateMany({
    where: { id: { in: toQueue.map((i) => i.id) } },
    data: { status: "PENDIENTE", attempts: 0, detail: null },
  });
  await enqueueDocumentJobs(requestId, toQueue.map((i) => i.id));
}

/** Toma y ejecuta un trabajo de la cola. Devuelve false si no había trabajos. */
export async function runNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;
  try {
    await runJob(job);
  } catch (e) {
    // Error inesperado del propio motor (no del conector): se reintenta más tarde.
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[motor] trabajo ${job.id}`, e);
    if (job.attempts >= MAX_ATTEMPTS) await failJob(job.id, message);
    else await retryJobLater(job.id, message, RETRY_DELAY_MS);
  }
  return true;
}

async function runJob(job: Job) {
  if (job.type !== "OBTENER_DOCUMENTO" || !job.itemId) {
    await failJob(job.id, `Tipo de trabajo desconocido: ${job.type}`);
    return;
  }
  const item = await prisma.requestItem.findUniqueOrThrow({
    where: { id: job.itemId },
    include: { documentType: true, request: { include: { user: true, comuna: { include: { region: true } } } } },
  });
  const { request, documentType } = item;
  if (item.status === "OBTENIDO" || request.status !== "EN_PROCESO") {
    await completeJob(job.id);
    return;
  }

  // Sin conector fijo, intenta el agente de IA (si hay clave de OpenRouter); si tampoco, queda para el equipo.
  const connector: Connector | undefined =
    connectorFor(documentType.code) ??
    (process.env.OPENROUTER_API_KEY
      ? { documentCode: documentType.code, name: "Agente IA", obtain: (ctx) => runExplorerAgent(documentType, ctx) }
      : undefined);
  const timeoutMs = connectorFor(documentType.code) ? CONNECTOR_TIMEOUT_MS : AGENT_TIMEOUT_MS;
  if (!connector) {
    console.log(`[motor #${request.number} ${documentType.code}] Sin conector automático: queda para el equipo.`);
    await prisma.requestItem.update({
      where: { id: item.id },
      data: { status: "REQUIERE_ACCION", detail: "Lo gestiona nuestro equipo (aún no está automatizado)." },
    });
    await completeJob(job.id);
    return;
  }

  const [manzana, predio] = request.rol.split("-");
  const property: PropertyRef = {
    requestNumber: request.number,
    rol: request.rol,
    manzana,
    predio,
    comuna: request.comuna.name,
    region: request.comuna.region.name,
    foja: request.foja,
    inscripcionNumero: request.inscripcionNumero,
    inscripcionAnio: request.inscripcionAnio,
  };
  const folder = request.folderPath ?? requestFolder(request.number);
  const log = (m: string) => console.log(`[motor #${request.number} ${documentType.code}] ${m}`);

  await prisma.requestItem.update({
    where: { id: item.id },
    data: { status: "OBTENIENDO", attempts: job.attempts, startedAt: new Date(), detail: null },
  });

  let result: ConnectorResult;
  try {
    result = await withTimeout(
      connector.obtain({ property, save: (name, content) => saveFile(folder, name, content), log }),
      timeoutMs,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`Error: ${message}`);
    const final = job.attempts >= MAX_ATTEMPTS;
    await prisma.requestItem.update({
      where: { id: item.id },
      data: {
        status: final ? "REQUIERE_ACCION" : "FALLIDO",
        finishedAt: new Date(),
        detail: final ? `No pudimos obtenerlo tras ${job.attempts} intentos; lo revisa nuestro equipo.` : "Reintentaremos.",
      },
    });
    await event(request.id, "DOCUMENTO_FALLIDO", `${documentType.name}: intento ${job.attempts} falló (${message}).`);
    if (final) await failJob(job.id, message);
    else await retryJobLater(job.id, message, RETRY_DELAY_MS * job.attempts);
    return;
  }

  log(result.status === "OBTENIDO" ? "Obtenido." : `Requiere acción: ${result.detail ?? ""}`);
  await prisma.requestItem.update({
    where: { id: item.id },
    data: {
      status: result.status,
      filePath: result.status === "OBTENIDO" ? result.filePath : null,
      detail: result.detail ?? null,
      finishedAt: new Date(),
    },
  });
  await event(
    request.id,
    result.status === "OBTENIDO" ? "DOCUMENTO_OBTENIDO" : "DOCUMENTO_REQUIERE_ACCION",
    result.status === "OBTENIDO" ? `${documentType.name}: obtenido.` : `${documentType.name}: ${result.detail}`,
  );
  await completeJob(job.id);
  await finishIfComplete(request.id, request.user.email, request.number);
}

async function finishIfComplete(requestId: string, email: string, number: number) {
  const items = await prisma.requestItem.findMany({ where: { requestId, selected: true }, select: { status: true } });
  if (!items.every((i) => i.status === "OBTENIDO")) return;
  // El informe (OpenRouter) se conecta después; por ahora la solicitud queda lista con los documentos.
  const { count } = await prisma.request.updateMany({
    where: { id: requestId, status: "EN_PROCESO" },
    data: { status: "COMPLETADA" },
  });
  if (count === 0) return; // otro worker ya la cerró
  await event(requestId, "COMPLETADA", "Todos los documentos fueron obtenidos.");
  await sendEmail(requestReadyEmail(email, number, requestId));
}

/** Procesa la cola hasta vaciarla (modo local, sin worker aparte). */
let draining = false;
export async function drainQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    while (await runNextJob()) {
      /* sigue */
    }
  } finally {
    draining = false;
  }
}
