import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Carpeta raíz de los documentos. En producción se reemplaza por S3 o similar.
const ROOT = path.resolve(process.env.STORAGE_DIR ?? "storage");

/** Carpeta de una solicitud, relativa a la raíz: "solicitudes/1001". */
export function requestFolder(number: number): string {
  return path.posix.join("solicitudes", String(number));
}

function resolveInside(relative: string): string {
  const full = path.resolve(ROOT, relative);
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) throw new Error(`Ruta fuera del almacenamiento: ${relative}`);
  return full;
}

export async function saveFile(folder: string, name: string, content: Uint8Array | string): Promise<string> {
  const relative = path.posix.join(folder, name);
  const full = resolveInside(relative);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, content);
  return relative;
}

export async function readStoredFile(relative: string): Promise<Buffer> {
  return readFile(resolveInside(relative));
}
