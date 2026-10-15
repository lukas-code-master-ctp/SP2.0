import type { RequestItem } from "@prisma/client";
import { prisma } from "../db";
import { requestReadyEmail, sendEmail } from "../email";
import { requestFolder, saveFile } from "../storage";
import { connectorFor } from "./registry";
import type { ConnectorResult, PropertyRef } from "./types";

const MAX_ATTEMPTS = 3;
const CONNECTOR_TIMEOUT_MS = 3 * 60_000;

// Evita procesar dos veces la misma solicitud en este proceso. En producción lo hace la cola (un job por documento).
const running = new Set<string>();

async function event(requestId: string, type: string, message: string) {
  await prisma.requestEvent.create({ data: { requestId, type, message } });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Tiempo agotado (${ms / 1000}s)`)), ms)),
  ]);
}

/** Procesa los documentos pendientes de una solicitud pagada, uno por uno. */
export async function processRequest(requestId: string): Promise<void> {
  if (running.has(requestId)) return;
  running.add(requestId);
  try {
    await run(requestId);
  } finally {
    running.delete(requestId);
  }
}

async function run(requestId: string) {
  const request = await prisma.request.findUniqueOrThrow({
    where: { id: requestId },
    include: {
      user: true,
      comuna: { include: { region: true } },
      items: { where: { selected: true }, include: { documentType: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!["PAGADA", "EN_PROCESO"].includes(request.status)) return;

  const folder = request.folderPath ?? requestFolder(request.number);
  if (request.status === "PAGADA" || !request.folderPath) {
    await prisma.request.update({ where: { id: requestId }, data: { status: "EN_PROCESO", folderPath: folder } });
    if (request.status === "PAGADA") await event(requestId, "EN_PROCESO", "Comenzamos a obtener los documentos.");
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

  for (const item of request.items) {
    if (item.status === "OBTENIDO" || item.status === "REQUIERE_ACCION") continue;
    if (item.status === "FALLIDO" && item.attempts >= MAX_ATTEMPTS) continue;
    await processItem(requestId, item, item.documentType, property, folder);
  }

  await finishIfComplete(requestId, request.user.email, request.number);
}

async function processItem(
  requestId: string,
  item: RequestItem,
  documentType: { code: string; name: string },
  property: PropertyRef,
  folder: string,
) {
  const connector = connectorFor(documentType.code);
  if (!connector) {
    await prisma.requestItem.update({
      where: { id: item.id },
      data: { status: "REQUIERE_ACCION", detail: "Lo gestiona nuestro equipo (aún no está automatizado)." },
    });
    return;
  }

  const attempts = item.attempts + 1;
  await prisma.requestItem.update({
    where: { id: item.id },
    data: { status: "OBTENIENDO", attempts, startedAt: new Date(), detail: null },
  });

  const log = (m: string) => console.log(`[obtención #${property.requestNumber} ${documentType.code}] ${m}`);
  let result: ConnectorResult;
  try {
    result = await withTimeout(
      connector.obtain({ property, save: (name, content) => saveFile(folder, name, content), log }),
      CONNECTOR_TIMEOUT_MS,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`Error: ${message}`);
    const final = attempts >= MAX_ATTEMPTS;
    await prisma.requestItem.update({
      where: { id: item.id },
      data: {
        status: final ? "REQUIERE_ACCION" : "FALLIDO",
        finishedAt: new Date(),
        detail: final ? `No pudimos obtenerlo tras ${attempts} intentos; lo revisa nuestro equipo.` : "Reintentaremos.",
      },
    });
    await event(requestId, "DOCUMENTO_FALLIDO", `${documentType.name}: intento ${attempts} falló (${message}).`);
    return;
  }

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
    requestId,
    result.status === "OBTENIDO" ? "DOCUMENTO_OBTENIDO" : "DOCUMENTO_REQUIERE_ACCION",
    result.status === "OBTENIDO" ? `${documentType.name}: obtenido.` : `${documentType.name}: ${result.detail}`,
  );
}

async function finishIfComplete(requestId: string, email: string, number: number) {
  const items = await prisma.requestItem.findMany({ where: { requestId, selected: true }, select: { status: true } });
  if (!items.every((i) => i.status === "OBTENIDO")) return;
  const request = await prisma.request.update({
    where: { id: requestId },
    // El informe (OpenRouter) se conecta después; por ahora la solicitud queda lista con los documentos.
    data: { status: "COMPLETADA" },
  });
  await event(requestId, "COMPLETADA", "Todos los documentos fueron obtenidos.");
  await sendEmail(requestReadyEmail(email, number, request.id));
}

/** Vuelve a dejar en cola los documentos con problemas y los procesa. */
export async function retryRequest(requestId: string): Promise<void> {
  await prisma.requestItem.updateMany({
    where: { requestId, selected: true, status: { in: ["FALLIDO", "REQUIERE_ACCION"] } },
    data: { status: "PENDIENTE", attempts: 0, detail: null },
  });
  await processRequest(requestId);
}
