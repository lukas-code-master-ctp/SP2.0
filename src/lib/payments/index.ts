import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

// Fase 2: agregar flowProvider / webpayProvider implementando PaymentProvider
// y una ruta /api/pagos/[proveedor]/confirmacion que llame a confirmPayment().
const providers: Record<string, PaymentProvider> = { mock: mockProvider };

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "mock";
  const provider = providers[name];
  if (!provider) throw new Error(`Proveedor de pago no soportado: ${name}`);
  return provider;
}

export type { PaymentProvider } from "./types";
