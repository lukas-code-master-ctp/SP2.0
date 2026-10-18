// Motor de obtención de documentos: toma trabajos de la cola y ejecuta los conectores.
// Corre en un servidor en Chile (los sitios del Estado bloquean conexiones del extranjero): npm run worker
import { createServer } from "node:http";
import { prisma } from "../lib/db";
import { runNextJob } from "../lib/fulfillment/engine";

const IDLE_MS = 3000;
// Documentos que se obtienen a la vez: así uno lento (p. ej. la TGR) no deja esperando a los demás.
const CONCURRENCY = Math.max(1, Number(process.env.WORKER_CONCURRENCY) || 4);
let stopping = false;

// Cloud Run exige un puerto abierto; respondemos un chequeo de salud simple.
if (process.env.PORT) {
  createServer((_, res) => res.end("ok")).listen(Number(process.env.PORT));
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    console.log(`[motor] ${signal}: termina el trabajo en curso y se detiene`);
    stopping = true;
  });
}

async function loop() {
  while (!stopping) {
    let worked = false;
    try {
      worked = await runNextJob();
    } catch (e) {
      console.error("[motor] error leyendo la cola", e);
    }
    if (!worked) await new Promise((r) => setTimeout(r, IDLE_MS));
  }
}

async function main() {
  console.log(`[motor] esperando trabajos (${CONCURRENCY} a la vez)…`);
  await Promise.all(Array.from({ length: CONCURRENCY }, loop));
  await prisma.$disconnect();
  process.exit(0);
}

void main();
