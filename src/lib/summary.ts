/**
 * Convierte el texto técnico del motor (resumen del agente, errores de navegador) en una frase corta
 * para el cliente. Los textos cortos ya están escritos para el cliente y se dejan igual; el texto completo
 * queda en la base y en el log del motor.
 */
const RULES: [RegExp, string][] = [
  [/^Solicitado: llegará a/i, "Solicitado; el certificado llegará por correo."],
  [/captcha|no soy un robot/i, "El sitio pide un captcha; lo completa nuestro equipo."],
  [/clave ?única|iniciar sesión|login|contraseña/i, "El sitio pide iniciar sesión; lo gestiona nuestro equipo."],
  [/sitio ca[ií]do|no responde|timeout|tiempo agotado|ERR_|net::/i, "El sitio del emisor no respondió."],
  [/fuera de Chile|bloquea conexiones/i, "El sitio bloquea conexiones desde fuera de Chile; lo gestiona nuestro equipo."],
  [/no termin[oó] en \d+ pasos|^Agente:/i, "No pudimos obtenerlo automáticamente; lo revisa nuestro equipo."],
];

const MAX = 140;

export function summarize(text: string | null | undefined): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX) return clean;
  for (const [re, phrase] of RULES) if (re.test(clean)) return phrase;
  const sentence = clean.match(/^.{20,}?[.!?](?=\s|$)/)?.[0];
  if (sentence && sentence.length <= MAX) return sentence;
  return `${clean.slice(0, MAX - 1).trimEnd()}…`;
}

/** Mensajes del historial: "Documento: detalle" con el detalle resumido. */
export function summarizeEvent(message: string): string {
  const failed = message.match(/^(.+?): intento (\d+) falló \((.*)\)\.?$/s);
  if (failed) return `${failed[1]}: intento ${failed[2]} sin éxito.`;
  const i = message.indexOf(": ");
  if (i > 0 && message.length > MAX) return `${message.slice(0, i)}: ${summarize(message.slice(i + 2))}`;
  return summarize(message);
}
