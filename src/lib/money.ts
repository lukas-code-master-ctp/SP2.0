const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

export function formatCLP(amount: number): string {
  return amount === 0 ? "Gratis" : clp.format(amount);
}
