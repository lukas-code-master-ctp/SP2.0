import { buildSheetPdf } from "../pdf";
import type { Connector } from "../types";

// Visor de Mapas del SII (https://www4.sii.cl/mapasui/internet/): API JSON pública, sin clave ni captcha.
const BASE = "https://www4.sii.cl/mapasui/services/data/mapasFacadeService/";
const NAMESPACE = "cl.sii.sdi.lob.bbrr.mapas.data.api.interfaces.MapasFacadeService/";

type SiiComuna = { codigo: string; nombre: string };
type SiiPredio = {
  rol: string;
  nombreComuna: string;
  direccion: string | null;
  destinoDescripcion: string | null;
  ubicacion: string | null;
  periodo: string | null;
  existePredio: number;
  valorTotal: number | null;
  valorAfecto: number | null;
  valorExento: number | null;
  supTerreno: number | null;
  supConsMt2: number | null;
  eacsDescripcion: string | null;
};

async function call<T>(operation: string, data?: unknown): Promise<T> {
  const body: Record<string, unknown> = {
    metaData: { namespace: NAMESPACE + operation, conversationId: "UNAUTHENTICATED-CALL", transactionId: crypto.randomUUID() },
  };
  if (data !== undefined) body.data = data;
  const res = await fetch(BASE + operation, {
    method: "POST",
    headers: { "Content-Type": "application/json", Referer: "https://www4.sii.cl/mapasui/internet/" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`SII ${operation} respondió ${res.status}`);
  const json = (await res.json()) as { data: T; metaData?: { errors?: unknown } };
  if (json.metaData?.errors) throw new Error(`SII ${operation} devolvió errores: ${JSON.stringify(json.metaData.errors)}`);
  return json.data;
}

export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

let comunasCache: SiiComuna[] | null = null;

async function siiComunaCode(comuna: string): Promise<string | null> {
  comunasCache ??= await call<SiiComuna[]>("listComunas");
  const target = normalizeName(comuna);
  return comunasCache.find((c) => normalizeName(c.nombre) === target)?.codigo ?? null;
}

const clp = (n: number | null) => (n == null ? "-" : `$${n.toLocaleString("es-CL")}`);
const m2 = (n: number | null) => (n ? `${n.toLocaleString("es-CL")} m²` : "Sin información");

export const siiAvaluo: Connector = {
  documentCode: "AVALUO_DETALLADO",
  name: "SII · Mapas (avalúo fiscal por rol)",
  async obtain({ property, save, log }) {
    const code = await siiComunaCode(property.comuna);
    if (!code) return { status: "REQUIERE_ACCION", detail: `El SII no reconoce la comuna "${property.comuna}".` };

    log(`Consultando SII: comuna ${code}, manzana ${property.manzana}, predio ${property.predio}`);
    const predio = await call<SiiPredio | null>("getPredioNacional", {
      predio: { comuna: code, manzana: property.manzana, predio: property.predio },
      servicios: [],
    });
    if (!predio || predio.existePredio !== 1) {
      return { status: "REQUIERE_ACCION", detail: `El SII no encontró el rol ${property.rol} en ${property.comuna}. Revisa el rol.` };
    }

    const consultedAt = new Date();
    await save("sii-avaluo.json", JSON.stringify({ consultedAt, source: BASE + "getPredioNacional", predio }, null, 2));
    const pdf = await buildSheetPdf(
      "Ficha de avalúo fiscal",
      `Fuente: SII, visor de Mapas · consultado el ${consultedAt.toLocaleString("es-CL", { timeZone: "America/Santiago" })}`,
      [
        ["Rol", predio.rol],
        ["Comuna", predio.nombreComuna],
        ["Dirección", predio.direccion ?? "-"],
        ["Destino", predio.destinoDescripcion ?? "-"],
        ["Ubicación", predio.ubicacion ?? "-"],
        ["Avalúo total", clp(predio.valorTotal)],
        ["Avalúo afecto", clp(predio.valorAfecto)],
        ["Avalúo exento", clp(predio.valorExento)],
        ["Superficie terreno", m2(predio.supTerreno)],
        ["Superficie construida", m2(predio.supConsMt2)],
        ["Período", predio.periodo ?? "-"],
        ["Reavalúo", predio.eacsDescripcion ?? "-"],
      ],
      [
        "Datos públicos del visor de Mapas del Servicio de Impuestos Internos. Información referencial según el propio SII.",
        "No reemplaza el certificado de avalúo fiscal detallado, que se emite con la clave tributaria del propietario.",
      ],
    );
    const filePath = await save("sii-avaluo.pdf", pdf);
    return {
      status: "OBTENIDO",
      filePath,
      detail: "Ficha con los datos públicos del SII. El certificado detallado oficial requiere la clave del propietario.",
    };
  },
};
