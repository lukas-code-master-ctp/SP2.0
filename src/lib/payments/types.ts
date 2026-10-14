export type CheckoutInput = {
  paymentId: string;
  amount: number; // CLP
  description: string;
  customerEmail: string;
};

export type CheckoutResult = {
  /** URL a la que se redirige al cliente para ingresar su tarjeta (pasarela alojada). */
  redirectUrl: string;
  externalId: string;
};

/**
 * Proveedor de pagos. La app NUNCA recibe ni guarda números de tarjeta:
 * el cliente ingresa su tarjeta en la página del proveedor (Webpay, Flow, Mercado Pago)
 * y el proveedor nos confirma el resultado (retorno + webhook).
 */
export interface PaymentProvider {
  name: string;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
}
