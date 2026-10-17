import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Almacenamiento de documentos: carpeta local en desarrollo, Supabase Storage en producción.
// STORAGE_DRIVER=local|supabase (por defecto local).

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".json": "application/json",
  ".html": "text/html",
  ".txt": "text/plain",
};

export function mimeFor(file: string): string {
  return MIME[path.extname(file)] ?? "application/octet-stream";
}

/** Carpeta de una solicitud, relativa a la raíz: "solicitudes/1001". */
export function requestFolder(number: number): string {
  return path.posix.join("solicitudes", String(number));
}

function checkRelative(relative: string) {
  const normalized = path.posix.normalize(relative);
  if (normalized.startsWith("..") || path.posix.isAbsolute(normalized)) throw new Error(`Ruta inválida: ${relative}`);
  return normalized;
}

type Driver = {
  write: (relative: string, content: Uint8Array | string) => Promise<void>;
  read: (relative: string) => Promise<Buffer>;
};

const localDriver = (): Driver => {
  const root = path.resolve(process.env.STORAGE_DIR ?? "storage");
  const full = (relative: string) => path.join(root, relative);
  return {
    async write(relative, content) {
      await mkdir(path.dirname(full(relative)), { recursive: true });
      await writeFile(full(relative), content);
    },
    read: (relative) => readFile(full(relative)),
  };
};

const supabaseDriver = (): Driver => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? "documentos";
  if (!url || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  const objectUrl = (relative: string) => `${url}/storage/v1/object/${bucket}/${relative.split("/").map(encodeURIComponent).join("/")}`;
  const headers = { Authorization: `Bearer ${key}`, apikey: key };
  return {
    async write(relative, content) {
      const res = await fetch(objectUrl(relative), {
        method: "POST",
        headers: { ...headers, "Content-Type": mimeFor(relative), "x-upsert": "true" },
        body: typeof content === "string" ? content : Buffer.from(content),
      });
      if (!res.ok) throw new Error(`Supabase Storage respondió ${res.status} al guardar ${relative}: ${await res.text()}`);
    },
    async read(relative) {
      const res = await fetch(objectUrl(relative), { headers });
      if (!res.ok) throw new Error(`Supabase Storage respondió ${res.status} al leer ${relative}`);
      return Buffer.from(await res.arrayBuffer());
    },
  };
};

let driver: Driver | null = null;
function getDriver(): Driver {
  driver ??= process.env.STORAGE_DRIVER === "supabase" ? supabaseDriver() : localDriver();
  return driver;
}

export async function saveFile(folder: string, name: string, content: Uint8Array | string): Promise<string> {
  const relative = checkRelative(path.posix.join(folder, name));
  await getDriver().write(relative, content);
  return relative;
}

export async function readStoredFile(relative: string): Promise<Buffer> {
  return getDriver().read(checkRelative(relative));
}
