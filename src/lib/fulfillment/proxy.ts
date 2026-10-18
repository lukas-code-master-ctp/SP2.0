// Algunos emisores (TGR) rechazan IPs de datacenter y de fuera de Chile. Para esos documentos el navegador
// sale por un proxy residencial chileno: PROXY_CL_URL=http://usuario:clave@host:puerto. El resto va directo,
// así el proxy (que se paga por GB) solo se usa donde hace falta.
const DEFAULT_DOCS = ["DEUDA_CONTRIBUCIONES"];

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
