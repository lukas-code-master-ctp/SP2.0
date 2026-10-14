// Envío de correos. En desarrollo se imprimen en consola.
// Fase 2: proveedor real (Resend, SES, SendGrid) según EMAIL_PROVIDER.

export type Email = { to: string; subject: string; text: string };

export async function sendEmail(email: Email): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  if (provider === "console") {
    console.log(`\n[email] Para: ${email.to}\n[email] Asunto: ${email.subject}\n${email.text}\n`);
    return;
  }
  throw new Error(`Proveedor de correo no soportado: ${provider}`);
}

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

export function requestReceivedEmail(to: string, number: number, requestId: string): Email {
  return {
    to,
    subject: `Recibimos tu solicitud #${number}`,
    text:
      `Tu pago fue confirmado y la solicitud #${number} está en proceso.\n` +
      `Te avisaremos por este medio apenas tengamos todos los documentos.\n\n` +
      `Puedes revisar el avance en ${appUrl()}/app/solicitudes/${requestId}`,
  };
}

export function requestReadyEmail(to: string, number: number, requestId: string): Email {
  return {
    to,
    subject: `Tu solicitud #${number} está lista`,
    text: `Ya puedes ver y descargar los documentos de tu solicitud en ${appUrl()}/app/solicitudes/${requestId}`,
  };
}
