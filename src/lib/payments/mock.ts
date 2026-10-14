import type { PaymentProvider } from "./types";

/**
 * Pasarela simulada para desarrollo. Redirige a /pago/simulado/[id], que imita la página
 * de un proveedor real. Tarjeta terminada en 0002 => rechazo; cualquier otra => aprobado.
 */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createCheckout({ paymentId }) {
    return { redirectUrl: `/pago/simulado/${paymentId}`, externalId: `mock_${paymentId}` };
  },
};

export function mockAuthorize(cardNumber: string): boolean {
  return !cardNumber.replace(/\D/g, "").endsWith("0002");
}
