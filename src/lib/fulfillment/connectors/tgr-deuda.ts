import type { Connector } from "../types";

// TGR bloquea conexiones desde fuera de Chile, así que este conector solo funciona corriendo en Chile.
// Etapa actual: abre el trámite con un navegador real y guarda captura y HTML para grabar la ruta exacta
// (formulario, captcha, descarga). Cuando la ruta esté grabada, este conector descargará el certificado.
const URL = "https://www.tgr.cl/tramites-tgr/certificado-de-deuda-de-contribuciones/";

export const tgrDeuda: Connector = {
  documentCode: "DEUDA_CONTRIBUCIONES",
  name: "TGR · Certificado de deuda de contribuciones",
  async obtain({ save, log }) {
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
      });
    } catch {
      return { status: "REQUIERE_ACCION", detail: "Falta instalar el navegador automático (npx playwright install chromium)." };
    }
    try {
      const page = await browser.newPage({ locale: "es-CL", viewport: { width: 1280, height: 900 } });
      log(`Abriendo ${URL}`);
      // "networkidle" nunca llega en tgr.cl (scripts que siguen cargando), así que esperamos el HTML y un margen fijo.
      await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(5_000);
      const title = await page.title();
      await save("_exploracion/tgr-1.png", await page.screenshot({ fullPage: true }));
      await save("_exploracion/tgr-1.html", await page.content());
      const links = await page.$$eval("a, button, iframe", (els) =>
        els.map((e) => `${e.tagName} ${(e as HTMLElement).innerText?.trim().replace(/\s+/g, " ") ?? ""} -> ${
          (e as HTMLAnchorElement).href || (e as HTMLIFrameElement).src || ""}`),
      );
      await save("_exploracion/tgr-1-enlaces.txt", `${page.url()}\n${title}\n\n${links.join("\n")}`);

      if (/no encontrada|no existe/i.test(title)) {
        return { status: "REQUIERE_ACCION", detail: "La TGR no mostró el trámite (bloquea conexiones desde fuera de Chile)." };
      }
      return { status: "REQUIERE_ACCION", detail: "Ruta de la TGR en grabación: guardamos la página del trámite para automatizarla." };
    } finally {
      await browser.close();
    }
  },
};
