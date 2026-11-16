// Matriz de disponibilidad: qué documento del catálogo se puede obtener por internet en cada comuna.
// Los que no (o los que no pudimos confirmar) se bloquean: no se pueden marcar ni pagar.
// Fuentes y criterios en docs/DISPONIBILIDAD.md.

import { CONSERVADORES, type Conservador } from "./conservadores";
import { DOM_EN_LINEA } from "./municipal";
import type { Disponibilidad, Estado } from "./tipos";

export type { Disponibilidad, Estado } from "./tipos";

/**
 * Bloquear también los documentos "por confirmar" (sin canal digital comprobado). Así nadie paga por algo que
 * quizás no podamos conseguir; si se confirma un emisor, se actualiza la matriz y se desbloquea.
 */
export const BLOQUEAR_POR_CONFIRMAR = true;

export function bloqueado(d: Disponibilidad): boolean {
  return d.estado === "NO_DISPONIBLE" || (BLOQUEAR_POR_CONFIRMAR && d.estado === "POR_CONFIRMAR");
}

const clave = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const conservadoresPorComuna = new Map<string, Conservador[]>();
for (const c of CONSERVADORES) {
  for (const comuna of c.comunas) {
    const k = clave(comuna);
    conservadoresPorComuna.set(k, [...(conservadoresPorComuna.get(k) ?? []), c]);
  }
}
const domPorComuna = new Map(Object.entries(DOM_EN_LINEA).map(([comuna, d]) => [clave(comuna), d]));

const NACIONAL: Record<string, string> = {
  AVALUO_DETALLADO: "El SII lo emite en línea para todo Chile.",
  DEUDA_CONTRIBUCIONES: "La Tesorería lo emite en línea para todo Chile.",
  MATRIMONIO: "El Registro Civil lo emite en línea para todo Chile.",
  POSESION_EFECTIVA: "El Registro Civil lo emite en línea para todo Chile.",
};
const CONSERVADOR = new Set(["DOMINIO_VIGENTE", "GP_30", "TITULOS_ANTERIORES", "PLANO_ARCHIVADO", "REGLAMENTO_COPROPIEDAD"]);
const DOM = new Set(["NUMERO", "CIP", "NO_EXPROPIACION_MUNICIPAL"]);
const PEOR: Estado[] = ["NO_DISPONIBLE", "POR_CONFIRMAR", "DISPONIBLE"];

const disponible = (motivo: string): Disponibilidad => ({ estado: "DISPONIBLE", motivo });
const porConfirmar = (motivo: string): Disponibilidad => ({ estado: "POR_CONFIRMAR", motivo });

/** Disponibilidad de un documento (por su código del catálogo) para una propiedad en `comuna`. */
export function disponibilidad(documentCode: string, comuna: string): Disponibilidad {
  const k = clave(comuna);

  if (NACIONAL[documentCode]) return disponible(NACIONAL[documentCode]);

  if (documentCode === "NO_EXPROPIACION_SERVIU") {
    return k === "antartica"
      ? { estado: "NO_DISPONIBLE", motivo: "El sistema en línea del SERVIU no incluye la comuna Antártica." }
      : disponible("El SERVIU lo emite en línea (cne.minvu.cl).");
  }

  if (CONSERVADOR.has(documentCode)) {
    const cbrs = conservadoresPorComuna.get(k) ?? [];
    if (cbrs.length === 0) return porConfirmar("No identificamos el conservador de esta comuna.");
    // Comunas con un conservador nuevo: las inscripciones antiguas siguen en el anterior, así que cuentan ambos.
    const peor = cbrs.reduce((a, b) => (PEOR.indexOf(b.estado) < PEOR.indexOf(a.estado) ? b : a));
    if (peor.estado === "DISPONIBLE") {
      return disponible(`${cbrs.map((c) => c.nombre).join(" y ")} recibe pedidos por internet.`);
    }
    const otros = cbrs.length > 1 ? ` (la comuna también depende de ${cbrs.filter((c) => c !== peor).map((c) => c.nombre).join(", ")})` : "";
    return {
      estado: peor.estado,
      motivo:
        peor.estado === "NO_DISPONIBLE"
          ? `${peor.nombre} no atiende pedidos por internet: ${peor.nota}${otros}`
          : `No pudimos confirmar que ${peor.nombre} atienda pedidos por internet: ${peor.nota}${otros}`,
    };
  }

  if (DOM.has(documentCode)) {
    const dom = domPorComuna.get(k);
    if (dom && (!dom.soloCip || documentCode === "CIP")) {
      return disponible(`La Dirección de Obras lo tramita en línea (${dom.plataforma}).`);
    }
    return porConfirmar("No encontramos un trámite en línea de la Dirección de Obras para este certificado en esta comuna.");
  }

  if (documentCode === "RECEPCION_FINAL") {
    return porConfirmar("La copia del certificado de recepción final se pide al archivo de la Dirección de Obras y no encontramos un trámite en línea.");
  }

  if (documentCode === "DEUDA_ASEO") {
    return k === "las condes"
      ? disponible("La Municipalidad lo consulta en línea (lascondesonline.cl).")
      : porConfirmar("No confirmamos un canal en línea de la municipalidad para el certificado de aseo.");
  }

  if (documentCode === "ESCRITURA_ULTIMA") {
    return porConfirmar("Depende de la notaría o del archivero judicial donde está la escritura; no se sabe por la comuna.");
  }

  return porConfirmar("Documento sin regla de disponibilidad.");
}
