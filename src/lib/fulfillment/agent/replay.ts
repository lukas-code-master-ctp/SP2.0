import { readFile } from "node:fs/promises";
import type { Browser, Download, Page } from "playwright";
import { contextOptions } from "../browser";
import { proxyFor } from "../proxy";
import type { ConnectorContext, ConnectorResult, PropertyRef } from "../types";
import { act, describe, type Step } from "./explorer";

// Repetición sin IA: cuando el agente ya obtuvo un documento, sus pasos se repiten tal cual para las solicitudes
// siguientes, cambiando los datos de la propiedad. Es rápido, gratis y no depende del modelo. Los ids de los
// elementos cambian de una carga a otra, así que cada elemento se busca por su texto ("input text \"Rol\"").
// Si algo no calza (el sitio cambió, hay un captcha nuevo), devuelve null y entra el agente.

export type RecipeStep = Pick<Step, "herramienta" | "argumentos" | "elemento" | "url">;
export type Recipe = { pasos: RecipeStep[]; propiedad?: PropertyRef };

const FIND_ATTEMPTS = 20; // con 3 s entre intentos: aguanta sitios que tardan un minuto por paso
const FIND_WAIT_MS = 3_000;

/** La receta sirve para repetir solo si terminó con una descarga y sabemos con qué propiedad se grabó. */
export function canReplay(recipe: Recipe | null | undefined): recipe is Recipe & { propiedad: PropertyRef } {
  const last = recipe?.pasos.at(-1);
  return Boolean(recipe?.propiedad && last?.herramienta === "terminar" && last.argumentos.resultado === "obtenido");
}

/** Cambia en un texto los datos de la propiedad con que se grabó la receta por los de la solicitud actual. */
export function adapt(text: string, from: PropertyRef, to: PropertyRef): string {
  const fields = ["rol", "manzana", "predio", "comuna", "region", "propietarioRun", "foja", "inscripcionNumero", "inscripcionAnio"] as const;
  const pairs = fields
    .map((f) => [from[f], to[f]].map((v) => (v === null || v === undefined ? "" : String(v))) as [string, string])
    .filter(([a]) => a.length > 0)
    // Los más largos primero, para que "502-259" se cambie entero antes que "502".
    .sort((a, b) => b[0].length - a[0].length);
  const marker = (i: number) => `\u0000${i}\u0000`;
  let out = text;
  pairs.forEach(([a], i) => {
    out = out.split(a).join(marker(i));
  });
  pairs.forEach(([, b], i) => {
    out = out.split(marker(i)).join(b);
  });
  return out;
}

export async function replayRecipe(
  documentCode: string,
  recipe: Recipe & { propiedad: PropertyRef },
  { property, save, log }: ConnectorContext,
): Promise<ConnectorResult | null> {
  let browser: Browser;
  try {
    const playwright = await import("playwright");
    browser = await playwright.chromium.launch({
      headless: process.env.CONNECTORS_HEADLESS !== "false",
      executablePath: process.env.CHROMIUM_PATH || undefined,
      proxy: proxyFor(documentCode),
    });
  } catch {
    return null;
  }
  try {
    const context = await browser.newContext({ ...contextOptions(browser), acceptDownloads: true });
    const downloads: Download[] = [];
    let page: Page;
    context.on("page", (p) => {
      page = p;
      p.on("download", (d) => downloads.push(d));
      p.on("close", () => {
        if (page === p) page = context.pages().at(-1) ?? page;
      });
    });
    page = await context.newPage();

    for (const [i, step] of recipe.pasos.entries()) {
      const n = i + 1;
      if (step.herramienta === "terminar") {
        const download = downloads.at(-1);
        if (!download) {
          log(`Repetición: terminó sin descarga en el paso ${n}; entra el agente.`);
          return null;
        }
        const ext = (download.suggestedFilename().split(".").pop() || "pdf").toLowerCase();
        const filePath = await save(`${documentCode.toLowerCase()}.${ext}`, await readFile(await download.path()));
        log(`Repetición: obtenido en ${n} pasos, sin IA.`);
        return { status: "OBTENIDO", filePath, detail: "Obtenido repitiendo la ruta grabada." };
      }

      const args: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(step.argumentos)) {
        args[k] = typeof v === "string" && k !== "id" ? adapt(v, recipe.propiedad, property) : v;
      }
      if (step.elemento) {
        const id = await findElement(page, step.elemento, String(step.argumentos.id ?? ""));
        if (!id) {
          log(`Repetición: no encontré ${step.elemento} en el paso ${n}; entra el agente.`);
          await save(`_agente/${documentCode}/repeticion-fallida.png`, await page.screenshot({ fullPage: true }).catch(() => new Uint8Array()));
          return null;
        }
        args.id = id;
      }
      try {
        await act(page, step.herramienta, args);
        await page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(1_500);
      } catch (e) {
        log(`Repetición: falló el paso ${n} (${e instanceof Error ? e.message.split("\n")[0] : e}); entra el agente.`);
        return null;
      }
    }
    return null;
  } finally {
    await browser.close();
  }
}

/** Busca en la página actual el elemento con el mismo texto; si hay varios, prefiere el del mismo id original. */
async function findElement(page: Page, elemento: string, originalId: string): Promise<string | null> {
  for (let attempt = 0; attempt < FIND_ATTEMPTS; attempt++) {
    if (attempt > 0) await page.waitForTimeout(FIND_WAIT_MS);
    const listing = await describe(page).catch(() => "");
    const ids = listing
      .split("\n")
      .map((line) => line.match(/^\[(\d+\.\d+)\] (.*)$/))
      .filter((m): m is RegExpMatchArray => m !== null && m[2] === elemento)
      .map((m) => m[1]);
    if (ids.length) return ids.includes(originalId) ? originalId : ids[0];
  }
  return null;
}
