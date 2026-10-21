import { PrismaClient } from "@prisma/client";
import { REGIONES } from "./data/chile";
import { DOCUMENTOS, TRAMITES } from "./data/catalogo";

const prisma = new PrismaClient();

// Corre en cada build de producción de Vercel, lejos de la base (São Paulo): cada consulta cuesta un viaje.
// Por eso lee todo de una vez y solo escribe lo que cambió; sin cambios son 4 lecturas.

/** true si algún campo de `want` difiere de `have`. */
function differs<T extends object>(have: T | undefined, want: Partial<T>): boolean {
  if (!have) return true;
  return Object.entries(want).some(([k, v]) => (have as Record<string, unknown>)[k] !== v);
}

async function main() {
  const [regiones, comunas, documentos, tramites] = await Promise.all([
    prisma.region.findMany(),
    prisma.comuna.findMany({ select: { regionId: true, name: true } }),
    prisma.documentType.findMany(),
    prisma.procedure.findMany({
      include: { requirements: { where: { regionId: null, comunaId: null }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  let cambios = 0;

  const regionPorId = new Map(regiones.map((r) => [r.id, r]));
  for (const r of REGIONES) {
    const data = { code: r.code, name: r.name, order: r.order };
    if (!differs(regionPorId.get(r.id), data)) continue;
    await prisma.region.upsert({ where: { id: r.id }, update: data, create: { id: r.id, ...data } });
    cambios++;
  }
  const comunasExistentes = new Set(comunas.map((c) => `${c.regionId}|${c.name}`));
  const comunasNuevas = REGIONES.flatMap((r) =>
    r.comunas.filter((name) => !comunasExistentes.has(`${r.id}|${name}`)).map((name) => ({ regionId: r.id, name })),
  );
  if (comunasNuevas.length) {
    await prisma.comuna.createMany({ data: comunasNuevas, skipDuplicates: true });
    cambios += comunasNuevas.length;
  }

  const docPorCodigo = new Map(documentos.map((d) => [d.code, d]));
  for (const d of DOCUMENTOS) {
    if (!differs(docPorCodigo.get(d.code), d)) continue;
    const doc = await prisma.documentType.upsert({ where: { code: d.code }, update: d, create: d });
    docPorCodigo.set(doc.code, doc);
    cambios++;
  }

  const tramitePorCodigo = new Map(tramites.map((t) => [t.code, t]));
  for (const t of TRAMITES) {
    const { documentos: codigos, ...data } = t;
    const actual = tramitePorCodigo.get(t.code);
    const procedure = differs(actual, data)
      ? (cambios++, await prisma.procedure.upsert({ where: { code: t.code }, update: data, create: data }))
      : actual!;
    // Requisitos generales (aplican a todo Chile): se regeneran solo si cambió la lista.
    const ids = codigos.map((code) => {
      const doc = docPorCodigo.get(code);
      if (!doc) throw new Error(`El trámite ${t.code} pide el documento ${code}, que no está en el catálogo.`);
      return doc.id;
    });
    const idsActuales = actual?.requirements.map((r) => r.documentTypeId) ?? [];
    if (ids.join() === idsActuales.join()) continue;
    await prisma.$transaction([
      prisma.procedureRequirement.deleteMany({ where: { procedureId: procedure.id, regionId: null, comunaId: null } }),
      prisma.procedureRequirement.createMany({
        data: ids.map((documentTypeId, i) => ({ procedureId: procedure.id, documentTypeId, sortOrder: i })),
      }),
    ]);
    cambios++;
  }

  console.log(
    `Seed listo (${cambios} cambios): ${REGIONES.length} regiones, ${comunas.length + comunasNuevas.length} comunas, ` +
      `${DOCUMENTOS.length} documentos, ${TRAMITES.length} trámites.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
