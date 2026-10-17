// Rol de avalúo SII: "manzana-predio", ej. "1234-56" o "00502-00259" (hasta 5 dígitos cada parte).
// Se admiten espacios y ceros a la izquierda.
const ROL_RE = /^\s*(\d{1,5})\s*-\s*(\d{1,5})\s*$/;

export function normalizeRol(input: string): string | null {
  const m = ROL_RE.exec(input);
  if (!m) return null;
  return `${Number(m[1])}-${Number(m[2])}`;
}
