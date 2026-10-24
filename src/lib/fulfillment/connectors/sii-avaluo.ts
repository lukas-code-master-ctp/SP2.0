import type { Connector } from "../types";

// "Consulta certificados de avalúo" del SII (https://www2.sii.cl/vicana/Menu/ConsultarAntecedentesSC):
// la página llama a una API JSON pública, sin clave ni captcha (el campo token va en blanco), que devuelve el
// Certificado de Avalúo Fiscal oficial en PDF (base64), con folio y código de verificación.
// El certificado "detallado" sigue requiriendo la clave del propietario; este es el simple.
const BASE = "https://www2.sii.cl/app/vicana/v1/";
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/plain, */*",
  Origin: "https://www2.sii.cl",
  Referer: "https://www2.sii.cl/vicana/Menu/ConsultarAntecedentesSC",
};
const ATTEMPTS = 3;

type SiiComuna = { codigoConaraSii: number; nombre: string };
type SiiBienRaiz = {
  comunaCnp: number;
  manzanaCnp: number;
  predioCnp: number;
  ultimoEacAplicado: number;
  comuna: string;
  rol: string;
  direccion: string | null;
  destino: string | null;
  avaluoFiscal: number | null;
  rutdv: string | null;
};

/** POST a la API; reintenta los errores pasajeros del SII ("Ocurrio un error técnico, reintente nuevamente"). */
async function call<T>(path: string, body: Record<string, unknown>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(BASE + path, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ token: " ", ...body }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`SII ${path} respondió ${res.status}`);
      const text = await res.text();
      // El certificado llega como base64 sin comillas aunque diga application/json.
      return (/^\s*[[{"]/.test(text) ? JSON.parse(text) : text) as T;
    } catch (e) {
      if (attempt >= ATTEMPTS) throw e;
      await new Promise((r) => setTimeout(r, 3_000 * attempt));
    }
  }
}

export function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

let comunasCache: SiiComuna[] | null = null;

async function siiComunaCode(comuna: string): Promise<number | null> {
  comunasCache ??= await call<SiiComuna[]>("comuna/obtener/todas", { action: "llenarComuna" });
  const target = normalizeName(comuna);
  return comunasCache.find((c) => normalizeName(c.nombre) === target)?.codigoConaraSii ?? null;
}

export const siiAvaluo: Connector = {
  documentCode: "AVALUO_DETALLADO",
  name: "SII · Certificado de avalúo fiscal",
  async obtain({ property, save, log }) {
    const code = await siiComunaCode(property.comuna);
    if (!code) return { status: "REQUIERE_ACCION", detail: `El SII no reconoce la comuna "${property.comuna}".` };

    log(`Consultando SII: comuna ${code}, manzana ${property.manzana}, predio ${property.predio}`);
    const rol = { comunaCnp: code, manzanaCnp: Number(property.manzana), predioCnp: Number(property.predio) };
    const [bien] = await call<SiiBienRaiz[]>("bienes-raices/buscar/por-rol", { action: "BusquedaSC", bienesRaices: rol });
    if (!bien) {
      return { status: "REQUIERE_ACCION", detail: `El SII no encontró el rol ${property.rol} en ${property.comuna}. Revisa el rol.` };
    }
    // Incluye el RUT del propietario (rutdv), que sirve para otros trámites.
    await save("sii-avaluo.json", JSON.stringify({ consultedAt: new Date(), bien }, null, 2));

    const b64 = await call<string>("cert-avaluo-fiscal/obtener/simple", {
      action: "GeneraCertificados",
      certificado: {
        tipoDocumento: "1", // Certificado de Avalúo Fiscal Simple
        tipoSolicitante: "2",
        tipoSolicitud: "3",
        motivo: "Estudio de títulos de la propiedad",
        institucionReceptor: "3", // Conservador
        otraInstitucion: "",
        correoReceptor: "",
        bienesRaices: [{ ...rol, ultimoEacAplicado: bien.ultimoEacAplicado }],
      },
    });
    const pdf = Buffer.from(b64, "base64");
    if (pdf.subarray(0, 5).toString() !== "%PDF-") throw new Error("El SII devolvió un certificado que no es PDF");
    const filePath = await save("sii-avaluo.pdf", pdf);
    log(`Certificado SII obtenido: ${bien.direccion ?? "-"}, avalúo $${(bien.avaluoFiscal ?? 0).toLocaleString("es-CL")}`);
    return {
      status: "OBTENIDO",
      filePath,
      detail: "Certificado de avalúo fiscal oficial (simple). El detallado requiere la clave del propietario.",
    };
  },
};
