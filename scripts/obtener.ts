// Pone en cola y procesa en esta terminal los documentos de una solicitud: npm run obtener -- 1001
import { prisma } from "../src/lib/db";
import { drainQueue, startFulfillment } from "../src/lib/fulfillment/engine";

async function main() {
  const number = Number(process.argv[2]);
  if (!number) throw new Error("Uso: npm run obtener -- <número de solicitud>");
  const request = await prisma.request.findUniqueOrThrow({ where: { number } });
  await startFulfillment(request.id);
  await drainQueue();
  const items = await prisma.requestItem.findMany({
    where: { requestId: request.id, selected: true },
    include: { documentType: true },
    orderBy: { sortOrder: "asc" },
  });
  for (const i of items) console.log(`${i.status.padEnd(16)} ${i.documentType.name}${i.detail ? ` · ${i.detail}` : ""}`);
}

main().finally(() => prisma.$disconnect());
