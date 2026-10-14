import { describe, expect, it } from "vitest";
import { computeDv, formatRut, isValidRut } from "./rut";

describe("rut", () => {
  it("calcula el dígito verificador", () => {
    expect(computeDv("12345678")).toBe("5");
    expect(computeDv("11111111")).toBe("1");
    expect(computeDv("10000013")).toBe("K");
  });
  it("valida con o sin formato", () => {
    expect(isValidRut("12.345.678-5")).toBe(true);
    expect(isValidRut("123456785")).toBe(true);
    expect(isValidRut("12.345.678-K")).toBe(false);
    expect(isValidRut("")).toBe(false);
  });
  it("formatea", () => {
    expect(formatRut("123456785")).toBe("12.345.678-5");
    expect(formatRut("10000013k")).toBe("10.000.013-K");
  });
});
