import { describe, expect, it } from "vitest";
import { REGIONES } from "../../../prisma/data/chile";
import { DOCUMENTOS } from "../../../prisma/data/catalogo";
import { CONSERVADORES } from "./conservadores";
import { DOM_EN_LINEA } from "./municipal";
import { bloqueado, disponibilidad } from ".";

const COMUNAS = REGIONES.flatMap((r) => r.comunas);

describe("disponibilidad", () => {
  it("cada comuna del catálogo tiene al menos un conservador", () => {
    const cubiertas = new Set(CONSERVADORES.flatMap((c) => c.comunas));
    expect(COMUNAS.filter((c) => !cubiertas.has(c))).toEqual([]);
  });

  it("los datos solo nombran comunas del catálogo", () => {
    const todas = new Set(COMUNAS);
    expect(CONSERVADORES.flatMap((c) => c.comunas).filter((c) => !todas.has(c))).toEqual([]);
    expect(Object.keys(DOM_EN_LINEA).filter((c) => !todas.has(c))).toEqual([]);
  });

  it("todo documento del catálogo tiene regla", () => {
    for (const d of DOCUMENTOS) {
      expect(disponibilidad(d.code, "Las Condes").motivo).not.toBe("Documento sin regla de disponibilidad.");
    }
  });

  it("Las Condes: se pide en línea todo menos la escritura y la recepción final", () => {
    const bloqueados = DOCUMENTOS.filter((d) => bloqueado(disponibilidad(d.code, "Las Condes"))).map((d) => d.code);
    expect(bloqueados.sort()).toEqual(["ESCRITURA_ULTIMA", "RECEPCION_FINAL"]);
  });

  it("los emisores nacionales están disponibles en todas partes", () => {
    for (const comuna of ["Putre", "Isla de Pascua", "Cabo de Hornos"]) {
      expect(disponibilidad("DEUDA_CONTRIBUCIONES", comuna).estado).toBe("DISPONIBLE");
      expect(disponibilidad("MATRIMONIO", comuna).estado).toBe("DISPONIBLE");
    }
  });

  it("bloquea el conservador sin canal digital", () => {
    const d = disponibilidad("DOMINIO_VIGENTE", "Isla de Pascua");
    expect(d.estado).toBe("NO_DISPONIBLE");
    expect(bloqueado(d)).toBe(true);
  });

  it("SERVIU no cubre la Antártica", () => {
    expect(disponibilidad("NO_EXPROPIACION_SERVIU", "Antártica").estado).toBe("NO_DISPONIBLE");
    expect(disponibilidad("NO_EXPROPIACION_SERVIU", "Marchigüe").estado).toBe("DISPONIBLE");
  });

  it("ignora tildes y mayúsculas en la comuna", () => {
    expect(disponibilidad("GP_30", "NUNOA")).toEqual(disponibilidad("GP_30", "Ñuñoa"));
  });
});
