import { describe, expect, it } from "vitest";
import { normalizeRol } from "./rol";

describe("normalizeRol", () => {
  it("normaliza espacios y ceros", () => {
    expect(normalizeRol(" 01234 - 056 ")).toBe("1234-56");
  });
  it("rechaza formatos inválidos", () => {
    expect(normalizeRol("1234")).toBeNull();
    expect(normalizeRol("abc-12")).toBeNull();
  });
});
