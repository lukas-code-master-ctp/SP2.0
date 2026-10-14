import { describe, expect, it } from "vitest";
import { normalizeRol } from "./rol";

describe("normalizeRol", () => {
  it("normaliza espacios y ceros", () => {
    expect(normalizeRol(" 01234 - 056 ")).toBe("1234-56");
  });
  it("acepta el formato de 5+5 dígitos del SII", () => {
    expect(normalizeRol("00502-00259")).toBe("502-259");
  });
  it("rechaza formatos inválidos", () => {
    expect(normalizeRol("1234")).toBeNull();
    expect(normalizeRol("abc-12")).toBeNull();
    expect(normalizeRol("123456-1")).toBeNull();
  });
});
