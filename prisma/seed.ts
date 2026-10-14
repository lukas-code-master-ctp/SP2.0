import { PrismaClient } from "@prisma/client";
import { REGIONES } from "./data/chile";
import { DOCUMENTOS, TRAMITES } from "./data/catalogo";

const prisma = new PrismaClient();

async function main() {
  for (const r of REGIONES) {
    await prisma.region.upsert({
      where: { id: r.id },
      update: { code: r.code, name: r.name, order: r.order },
      create: { id: r.id, code: r.code, name: r.name, order: r.order },
    });
    for (const name of r.comunas) {
      await prisma.comuna.upsert({
        where: { regionId_name: { regionId: r.id, name } },
        update: {},
        create: { regionId: r.id, name },
      });
    }
  }

  for (const d of DOCUMENTOS) {
    await prisma.documentType.upsert({ where: { code: d.code }, update: d, create: d });
  }

  for (const t of TRAMITES) {
    const { documentos, ...data } = t;
    const procedure = await prisma.procedure.upsert({ where: { code: t.code }, update: data, create: data });
    // Requisitos generales (aplican a todo Chile). Se regeneran en cada seed.
    await prisma.procedureRequirement.deleteMany({ where: { procedureId: procedure.id, regionId: null, comunaId: null } });
    for (const [i, code] of documentos.entries()) {
      const doc = await prisma.documentType.findUniqueOrThrow({ where: { code } });
      await prisma.procedureRequirement.create({
        data: { procedureId: procedure.id, documentTypeId: doc.id, sortOrder: i },
      });
    }
  }

  const comunas = await prisma.comuna.count();
  console.log(`Seed listo: ${REGIONES.length} regiones, ${comunas} comunas, ${DOCUMENTOS.length} documentos, ${TRAMITES.length} trámites.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
