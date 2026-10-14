// Resuelve qué documentos requiere un trámite en una comuna determinada.
// Reglas: los requisitos generales (sin región/comuna) aplican siempre; los de región
// y comuna agregan documentos, y una fila con `excluded` quita ese documento.
// Lo más específico gana: comuna > región > general.

export type RequirementRow = {
  documentTypeId: string;
  regionId: number | null;
  comunaId: number | null;
  excluded: boolean;
  sortOrder: number;
};

function specificity(r: RequirementRow): number {
  if (r.comunaId != null) return 2;
  if (r.regionId != null) return 1;
  return 0;
}

export function resolveRequirements(rows: RequirementRow[], regionId: number, comunaId: number): string[] {
  const applicable = rows.filter(
    (r) => (r.comunaId == null || r.comunaId === comunaId) && (r.regionId == null || r.regionId === regionId),
  );
  const winner = new Map<string, RequirementRow>();
  for (const r of applicable) {
    const prev = winner.get(r.documentTypeId);
    if (!prev || specificity(r) > specificity(prev)) winner.set(r.documentTypeId, r);
  }
  return [...winner.values()]
    .filter((r) => !r.excluded)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => r.documentTypeId);
}

export function computeTotals(
  items: { price: number; selected: boolean }[],
  includeReport: boolean,
  reportPrice: number,
) {
  const documentsTotal = items.filter((i) => i.selected).reduce((acc, i) => acc + i.price, 0);
  const reportTotal = includeReport ? reportPrice : 0;
  return { documentsTotal, reportTotal, total: documentsTotal + reportTotal };
}
