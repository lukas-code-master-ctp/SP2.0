import { describe, expect, it } from "vitest";
import { computeTotals, resolveRequirements, type RequirementRow } from "./requirements";

const row = (documentTypeId: string, extra: Partial<RequirementRow> = {}): RequirementRow => ({
  documentTypeId,
  regionId: null,
  comunaId: null,
  excluded: false,
  sortOrder: 0,
  ...extra,
});

describe("resolveRequirements", () => {
  it("aplica requisitos generales en orden", () => {
    const rows = [row("b", { sortOrder: 2 }), row("a", { sortOrder: 1 })];
    expect(resolveRequirements(rows, 13, 100)).toEqual(["a", "b"]);
  });
  it("agrega documentos de la región y comuna correspondientes", () => {
    const rows = [row("a"), row("rm", { regionId: 13 }), row("v", { regionId: 5 }), row("stgo", { comunaId: 100 })];
    expect(resolveRequirements(rows, 13, 100)).toEqual(["a", "rm", "stgo"]);
    expect(resolveRequirements(rows, 13, 101)).toEqual(["a", "rm"]);
  });
  it("una exclusión más específica gana", () => {
    const rows = [row("a"), row("b"), row("b", { comunaId: 100, excluded: true })];
    expect(resolveRequirements(rows, 13, 100)).toEqual(["a"]);
    expect(resolveRequirements(rows, 13, 101)).toEqual(["a", "b"]);
  });
});

describe("computeTotals", () => {
  it("suma solo lo seleccionado y el informe si corresponde", () => {
    const items = [
      { price: 6500, selected: true },
      { price: 0, selected: true },
      { price: 7500, selected: false },
    ];
    expect(computeTotals(items, false, 45000)).toEqual({ documentsTotal: 6500, reportTotal: 0, total: 6500 });
    expect(computeTotals(items, true, 45000)).toEqual({ documentsTotal: 6500, reportTotal: 45000, total: 51500 });
  });
});
