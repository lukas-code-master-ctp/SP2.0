import { describe, expect, it } from "vitest";
import type { PropertyRef } from "../types";
import { adapt, canReplay } from "./replay";

const base: PropertyRef = {
  requestNumber: 1,
  rol: "502-259",
  manzana: "502",
  predio: "259",
  comuna: "Las Condes",
  region: "Metropolitana",
  regionId: 13,
  foja: null,
  inscripcionNumero: null,
  inscripcionAnio: null,
  propietarioRun: "12.345.678-5",
};

describe("adapt", () => {
  const other = { ...base, rol: "1200-17", manzana: "1200", predio: "17", comuna: "Vitacura", propietarioRun: "9.876.543-3" };

  it("cambia los datos de la propiedad grabada por los de la nueva", () => {
    expect(adapt("rol 502-259 en Las Condes", base, other)).toBe("rol 1200-17 en Vitacura");
    expect(adapt("502", base, other)).toBe("1200");
    expect(adapt("12.345.678-5", base, other)).toBe("9.876.543-3");
  });

  it("no cruza valores que se cambian entre sí", () => {
    const swapped = { ...base, manzana: "259", predio: "502", rol: "259-502" };
    expect(adapt("502 / 259", base, swapped)).toBe("259 / 502");
  });

  it("deja igual el texto que no es de la propiedad", () => {
    expect(adapt("documentos@smartprop.io", base, other)).toBe("documentos@smartprop.io");
  });
});

describe("canReplay", () => {
  const terminar = { herramienta: "terminar", argumentos: { resultado: "obtenido" }, url: "x" };

  it("solo repite rutas que terminaron en descarga y saben su propiedad", () => {
    expect(canReplay({ pasos: [terminar], propiedad: base })).toBe(true);
    expect(canReplay({ pasos: [terminar] })).toBe(false);
    expect(canReplay({ pasos: [{ ...terminar, argumentos: { resultado: "enviado_por_correo" } }], propiedad: base })).toBe(false);
    expect(canReplay(null)).toBe(false);
  });
});
