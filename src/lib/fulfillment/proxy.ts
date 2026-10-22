// Para un emisor que rechace IPs de datacenter o de fuera de Chile, el navegador puede salir por un proxy
// residencial chileno: PROXY_CL_URL=http://usuario:clave@host:puerto y PROXY_CL_DOCS=CODIGO1,CODIGO2.
// Por defecto nada usa el proxy (se paga por GB): la TGR, que parecía bloquear IPs, en realidad rechazaba
// el User-Agent "HeadlessChrome" (ver browser.ts).
const DEFAULT_DOCS: string[] = [];

export function proxyFor(documentCode: string): { server: string; username?: string; password?: string } | undefined {
  const raw = process.env.PROXY_CL_URL;
  if (!raw) return undefined;
  const docs = process.env.PROXY_CL_DOCS?.split(",").map((s) => s.trim()).filter(Boolean) ?? DEFAULT_DOCS;
  if (!docs.includes(documentCode)) return undefined;
  const url = new URL(raw);
  return {
    server: `${url.protocol}//${url.host}`,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
  };
}
