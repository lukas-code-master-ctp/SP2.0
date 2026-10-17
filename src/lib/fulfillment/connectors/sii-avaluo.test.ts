import { describe, expect, it } from "vitest";
import { normalizeName } from "./sii-avaluo";

describe("normalizeName", () => {
  it("compara comunas sin tildes ni mayúsculas", () => {
    expect(normalizeName("Ñuñoa")).toBe(normalizeName("ÑUÑOA"));
    expect(normalizeName(" Alhué ")).toBe("ALHUE");
  });
});
