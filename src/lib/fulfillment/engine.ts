import type { Job } from "@prisma/client";
import { prisma } from "../db";
import { requestReadyEmail, sendEmail } from "../email";
import { requestFolder, saveFile } from "../storage";
import { claimNextJob, completeJob, enqueueDocumentJobs, failJob, retryJobLater } from "./queue";
import type { AgentDocument } from "./agent/explorer";
import { obtainWithAgent, SiteDownError } from "./agent/self-heal";
import { ownerRut } from "./connectors/sii-avaluo";
import { isCompanyRut } from "../rut";
import { connectorFor } from "./registry";
import type { Connector, ConnectorContext, ConnectorResult, PropertyRef } from "./types";

export const MAX_ATTEMPTS = 3;
const CONNECTOR_TIMEOUT_MS = 3 * 60_000;
// El agente navega paso a paso con un modelo de IA, así que le damos más margen que a un conector fijo.
const AGENT_TIMEOUT_MS = 20 * 60_000; // hasta dos intentos del agente
const RETRY_DELAY_MS = 30_000;
const SITE_DOWN_DELAY_MS = 15 * 60_000;

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
    include: { items: { where: { selected: true, status: { notIn: ["OBTENIDO", "NO_APLICA"] } } } },
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
  if (item.status === "OBTENIDO" || item.status === "NO_APLICA" || request.status !== "EN_PROCESO") {
    await completeJob(job.id);
    return;
  }

  const fixed = connectorFor(documentType.code);
  const agent = Boolean(process.env.OPENROUTER_API_KEY);
  if (!fixed && !agent) {
    console.log(`[motor #${request.number} ${documentType.code}] Sin conector automático: queda para el equipo.`);
    await prisma.requestItem.update({
      where: { id: item.id },
      data: { status: "REQUIERE_ACCION", detail: "Lo gestiona nuestro equipo (aún no está automatizado)." },
    });
    await completeJob(job.id);
    return;
  }

  const [manzana, predio] = request.rol.split("-");
  const log = (m: string) => console.log(`[motor #${request.number} ${documentType.code}] ${m}`);
  // Aseo y matrimonio piden el RUT del propietario. Es opcional en el formulario: si falta, lo da el SII por el rol
  // (en la 1016 ambos quedaron en revisión por no tenerlo). Se guarda en la solicitud para los demás documentos.
  let propietarioRun = request.propietarioRun;
  if (!propietarioRun) {
    propietarioRun = await ownerRut(request.comuna.name, manzana, predio).catch(() => null);
    if (propietarioRun) {
      log("RUT del propietario tomado del SII.");
      await prisma.request.update({ where: { id: request.id }, data: { propietarioRun } });
    }
  }
  const property: PropertyRef = {
    requestNumber: request.number,
    rol: request.rol,
    manzana,
    predio,
    comuna: request.comuna.name,
    region: request.comuna.region.name,
    regionId: request.comuna.region.id,
    foja: request.foja,
    inscripcionNumero: request.inscripcionNumero,
    inscripcionAnio: request.inscripcionAnio,
    propietarioRun,
  };
  const folder = request.folderPath ?? requestFolder(request.number);

  await prisma.requestItem.update({
    where: { id: item.id },
    data: { status: "OBTENIENDO", attempts: job.attempts, startedAt: new Date(), detail: null },
  });

  let result: ConnectorResult;
  try {
    const ctx: ConnectorContext = { property, save: (name, content) => saveFile(folder, name, content), log };
    // Una empresa no se casa: no tiene sentido mandar al agente al Registro Civil.
    result =
      documentType.code === "MATRIMONIO" && propietarioRun && isCompanyRut(propietarioRun)
        ? { status: "NO_APLICA", detail: "El propietario es una empresa, así que no tiene certificado de matrimonio." }
        : await obtain(fixed, agent ? documentType : null, ctx);
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
    // Si el sitio del emisor está caído no sirve reintentar en segundos: esperamos más.
    else await retryJobLater(job.id, message, e instanceof SiteDownError ? SITE_DOWN_DELAY_MS : RETRY_DELAY_MS * job.attempts);
    return;
  }

  log(result.status === "OBTENIDO" ? "Obtenido." : `${result.status === "NO_APLICA" ? "No aplica" : "Requiere acción"}: ${result.detail ?? ""}`);
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
    result.status === "OBTENIDO" ? "DOCUMENTO_OBTENIDO" : result.status === "NO_APLICA" ? "DOCUMENTO_NO_APLICA" : "DOCUMENTO_REQUIERE_ACCION",
    result.status === "OBTENIDO" ? `${documentType.name}: obtenido.` : `${documentType.name}: ${result.detail}`,
  );
  await completeJob(job.id);
  await finishIfComplete(request.id, request.user.email, request.number);
}

/**
 * Primero el conector fijo (rápido y barato). Si no existe, falla o no lo logra, entra el agente de IA, que
 * recuerda lo que funcionó antes y reintenta solo cuando puede corregirse (ver agent/self-heal.ts).
 */
async function obtain(
  fixed: Connector | undefined,
  agentDoc: AgentDocument | null,
  ctx: ConnectorContext,
): Promise<ConnectorResult> {
  if (fixed) {
    try {
      const result = await withTimeout(fixed.obtain(ctx), fixed.timeoutMs ?? CONNECTOR_TIMEOUT_MS);
      if (result.status === "OBTENIDO" || !agentDoc) return result;
      ctx.log(`El conector fijo no lo logró (${result.detail}); entra el agente.`);
    } catch (e) {
      if (!agentDoc) throw e;
      ctx.log(`El conector fijo falló (${e instanceof Error ? e.message : e}); entra el agente.`);
    }
  }
  return withTimeout(obtainWithAgent(agentDoc!, ctx), AGENT_TIMEOUT_MS);
}

async function finishIfComplete(requestId: string, email: string, number: number) {
  const items = await prisma.requestItem.findMany({ where: { requestId, selected: true }, select: { status: true } });
  // Un documento que no aplica (p. ej., sin matrimonio inscrito) no deja la solicitud pendiente.
  if (!items.every((i) => i.status === "OBTENIDO" || i.status === "NO_APLICA")) return;
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
