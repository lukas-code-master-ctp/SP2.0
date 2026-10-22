import { inflateSync } from "node:zlib";
import { contextOptions } from "../browser";
import { proxyFor } from "../proxy";
import type { Connector } from "../types";
import { normalizeName } from "./sii-avaluo";

// Formulario de la TGR que va embebido en https://tgr.gob.cl/tramites-tgr/certificado-de-deuda-de-contribuciones/.
// Se abre directo: región → (recarga) comuna → rol y subrol → "Buscar", que pasa un reCAPTCHA invisible (v3) y
// devuelve una página con el certificado oficial en PDF dentro de un input oculto (#base64PDF).
// Si Google desconfía del navegador, aparece el reCAPTCHA de casilla y queda para revisión humana.
// Ojo: a un navegador que se anuncia como "HeadlessChrome" la TGR le responde "Página no encontrada" o
// "AccessDenied"; por eso el User-Agent de contextOptions. Con eso funciona sin proxy, incluso fuera de Chile.
const FORM = "https://www.tesoreria.cl/CertDeudasRolCutAixWeb/Controller.jpf?RUT=0&DV=0&EMAIL=";

/** Texto de las líneas del PDF (la TGR lo genera con JasperReports: streams Flate con texto literal). */
export function pdfText(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  let text = "";
  for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)endstream/g)) {
    try {
      text += inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
    } catch {
      // Stream que no es Flate (imágenes sin comprimir): no tiene texto.
    }
  }
  return [...text.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)].map((m) => m[1]).join("\n");
}

export const tgrDeuda: Connector = {
  documentCode: "DEUDA_CONTRIBUCIONES",
  name: "TGR · Certificado de deuda de contribuciones",
  async obtain({ property, save, log }) {
    let playwright: typeof import("playwright");
    try {
      playwright = await import("playwright");
    } catch {
      return { status: "REQUIERE_ACCION", detail: "Falta instalar el navegador automático (npx playwright install chromium)." };
    }

    let browser: import("playwright").Browser;
    try {
      browser = await playwright.chromium.launch({
        headless: process.env.CONNECTORS_HEADLESS !== "false",
        executablePath: process.env.CHROMIUM_PATH || undefined,
        proxy: proxyFor("DEUDA_CONTRIBUCIONES"),
      });
    } catch {
      return { status: "REQUIERE_ACCION", detail: "Falta instalar el navegador automático (npx playwright install chromium)." };
    }
    try {
      const page = await browser.newPage(contextOptions(browser));
      const alerts: string[] = [];
      page.on("dialog", (d) => {
        alerts.push(d.message());
        void d.dismiss();
      });

      log(`Abriendo formulario TGR (región ${property.regionId}, ${property.comuna}, rol ${property.rol})`);
      await page.goto(FORM, { waitUntil: "domcontentloaded", timeout: 60_000 });
      const title = await page.title();
      if (!(await page.$("#region"))) {
        await save("_exploracion/tgr-formulario.html", await page.content());
        throw new Error(`La TGR no mostró el formulario (título "${title}")`);
      }

      // Los valores del selector de región son el número oficial de la región, igual que Region.id.
      await Promise.all([
        page.waitForURL(/begin\.do/, { timeout: 30_000 }),
        page.selectOption("#region", String(property.regionId)),
      ]);
      const comunas = await page.$$eval("#comuna option", (os) => os.map((o) => ({ value: (o as HTMLOptionElement).value, label: o.textContent ?? "" })));
      const target = normalizeName(property.comuna);
      // Las etiquetas vienen como "LAS CONDES (71)".
      const comuna = comunas.find((c) => normalizeName(c.label.replace(/\(\d+\)/, "")) === target);
      if (!comuna) return { status: "REQUIERE_ACCION", detail: `La TGR no tiene la comuna "${property.comuna}" en esa región.` };
      await page.selectOption("#comuna", comuna.value);
      await page.fill("#rol", property.manzana);
      await page.fill("#subRol", property.predio);

      await page.click("#buscar");
      const ok = await page
        .waitForSelector("#base64PDF", { state: "attached", timeout: 45_000 })
        .then(() => true)
        .catch(() => false);
      if (!ok) {
        await save("_exploracion/tgr-sin-certificado.png", await page.screenshot({ fullPage: true }));
        if (alerts.some((a) => /desaf/i.test(a)) || (await page.isVisible("div.g-recaptcha:not([hidden])"))) {
          return { status: "REQUIERE_ACCION", detail: "La TGR pidió resolver un captcha: hay que sacarlo a mano." };
        }
        throw new Error(`La TGR no devolvió el certificado${alerts.length ? ` (aviso: ${alerts.join(" / ")})` : ""}`);
      }

      const pdf = Buffer.from(await page.inputValue("#base64PDF"), "base64");
      if (pdf.subarray(0, 5).toString() !== "%PDF-") throw new Error("La TGR devolvió un certificado que no es PDF");
      const resumen = pdfText(pdf).split("\n").find((l) => l.startsWith("ESTE ROL")) ?? "";
      log(`Certificado TGR: ${resumen || "(sin línea de resumen)"}`);
      // Para un rol inexistente la TGR igual emite el PDF, diciendo que no está registrado: no sirve como certificado.
      if (/NO APARECE REGISTRADO/i.test(resumen)) {
        await save("_exploracion/tgr-rol-no-registrado.pdf", pdf);
        return { status: "REQUIERE_ACCION", detail: `La TGR dice que el rol ${property.rol} no está registrado en ${property.comuna}. Revisa el rol.` };
      }
      const filePath = await save("tgr-deuda-contribuciones.pdf", pdf);
      return {
        status: "OBTENIDO",
        filePath,
        detail: /NO REGISTRA DEUDA/i.test(resumen) ? "No registra deuda." : "Registra deuda: revisa el certificado.",
      };
    } finally {
      await browser.close();
    }
  },
};
