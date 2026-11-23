// Matriz de disponibilidad: qué documento del catálogo se puede obtener a distancia en cada comuna.
// Los que no se pueden obtener sin ir en persona se bloquean: no se pueden marcar ni pagar.
// Fuentes y criterios en docs/DISPONIBILIDAD.md.

import { CONSERVADORES, type Conservador } from "./conservadores";
import { MUNICIPAL, type DocMunicipal } from "./municipal";
import type { Disponibilidad } from "./tipos";

export type { Disponibilidad, Estado } from "./tipos";

export function bloqueado(d: Disponibilidad): boolean {
  return d.estado === "NO_DISPONIBLE";
}

const clave = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const conservadoresPorComuna = new Map<string, Conservador[]>();
for (const c of CONSERVADORES) {
  for (const comuna of c.comunas) {
    const k = clave(comuna);
    conservadoresPorComuna.set(k, [...(conservadoresPorComuna.get(k) ?? []), c]);
  }
}
const municipalPorComuna = new Map(Object.entries(MUNICIPAL).map(([comuna, m]) => [clave(comuna), m]));

const NACIONAL: Record<string, string> = {
  AVALUO_DETALLADO: "El SII lo emite en línea para todo Chile.",
  DEUDA_CONTRIBUCIONES: "La Tesorería lo emite en línea para todo Chile.",
  MATRIMONIO: "El Registro Civil lo emite en línea para todo Chile.",
  POSESION_EFECTIVA: "El Registro Civil lo emite en línea para todo Chile.",
  ESCRITURA_ULTIMA:
    "Las notarías entregan copias de escrituras a distancia (Ley 21.772); las más antiguas, el archivero judicial.",
};
const CONSERVADOR = new Set(["DOMINIO_VIGENTE", "GP_30", "TITULOS_ANTERIORES", "PLANO_ARCHIVADO", "REGLAMENTO_COPROPIEDAD"]);
const MUNICIPALES = new Set<string>(["NUMERO", "CIP", "NO_EXPROPIACION_MUNICIPAL", "RECEPCION_FINAL", "DEUDA_ASEO"]);

const disponible = (motivo: string): Disponibilidad => ({ estado: "DISPONIBLE", motivo });
const noDisponible = (motivo: string): Disponibilidad => ({ estado: "NO_DISPONIBLE", motivo });

/** Disponibilidad de un documento (por su código del catálogo) para una propiedad en `comuna`. */
export function disponibilidad(documentCode: string, comuna: string): Disponibilidad {
  const k = clave(comuna);

  if (NACIONAL[documentCode]) return disponible(NACIONAL[documentCode]);

  if (documentCode === "NO_EXPROPIACION_SERVIU") {
    return k === "antartica"
      ? noDisponible("El sistema en línea del SERVIU no incluye la comuna Antártica.")
      : disponible("El SERVIU lo emite en línea (cne.minvu.cl).");
  }

  if (CONSERVADOR.has(documentCode)) {
    const cbrs = conservadoresPorComuna.get(k) ?? [];
    if (cbrs.length === 0) return noDisponible("No identificamos el conservador de esta comuna.");
    // Comunas con un conservador nuevo: las inscripciones antiguas siguen en el anterior, así que deben servir ambos.
    const sinCanal = cbrs.find((c) => c.estado === "NO_DISPONIBLE");
    if (sinCanal) return noDisponible(`${sinCanal.nombre} solo atiende en persona: ${sinCanal.nota}`);
    return disponible(cbrs.map((c) => `${c.nombre}: ${c.nota}`).join(" "));
  }

  if (MUNICIPALES.has(documentCode)) {
    const canal = municipalPorComuna.get(k)?.[documentCode as DocMunicipal];
    return canal
      ? disponible(`La municipalidad lo tramita a distancia: ${canal}`)
      : noDisponible("No encontramos en el sitio de la municipalidad una forma de pedirlo a distancia (en línea ni por correo).");
  }

  return noDisponible("Documento sin regla de disponibilidad.");
}
