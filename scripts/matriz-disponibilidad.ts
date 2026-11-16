// Exporta la matriz documento × comuna a CSV: npx tsx scripts/matriz-disponibilidad.ts > matriz.csv
import { REGIONES } from "../prisma/data/chile";
import { DOCUMENTOS } from "../prisma/data/catalogo";
import { disponibilidad } from "../src/lib/disponibilidad";

const csv = (v: string) => `"${v.replace(/"/g, '""')}"`;
console.log(["region", "comuna", "documento", "codigo", "estado", "motivo"].join(","));
for (const r of [...REGIONES].sort((a, b) => a.order - b.order)) {
  for (const comuna of r.comunas) {
    for (const d of DOCUMENTOS) {
      const { estado, motivo } = disponibilidad(d.code, comuna);
      console.log([r.name, comuna, d.name, d.code, estado, motivo].map(csv).join(","));
    }
  }
}
