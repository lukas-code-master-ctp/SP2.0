import { proxyFor } from "../proxy";
import type { Connector } from "../types";

// TGR bloquea IPs de datacenter (también Cloud Run Santiago): en la nube sale por el proxy chileno (ver proxy.ts).
// Etapa actual: abre el trámite con un navegador real y guarda captura y HTML para grabar la ruta exacta
// (formulario, captcha, descarga). Cuando la ruta esté grabada, este conector descargará el certificado.
// La TGR se mudó a tgr.gob.cl: la ruta antigua de www.tgr.cl responde "Página no encontrada" incluso desde Chile.
const URL = "https://tgr.gob.cl/certificado-deuda-contribuciones/";

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

    const proxy = proxyFor("DEUDA_CONTRIBUCIONES");
    let browser: import("playwright").Browser;
    try {
      browser = await playwright.chromium.launch({
        headless: process.env.CONNECTORS_HEADLESS !== "false",
        executablePath: process.env.CHROMIUM_PATH || undefined,
        proxy,
      });
    } catch {
      return { status: "REQUIERE_ACCION", detail: "Falta instalar el navegador automático (npx playwright install chromium)." };
    }
    try {
      const page = await browser.newPage({ locale: "es-CL", viewport: { width: 1280, height: 900 } });
      // Deja en el log por dónde sale el navegador (sin credenciales), para distinguir un bloqueo de un proxy mal cargado.
      if (!proxy) log("Sin proxy: PROXY_CL_URL no está cargado en el motor.");
      else {
        // Se abre en el navegador (no con page.request) para que pase por el mismo proxy que el trámite.
        const salida = await page
          .goto("https://ipinfo.io/json", { timeout: 20_000 })
          .then(async () => { const j = JSON.parse(await page.innerText("body")); return `IP ${j.ip} (${j.country}, ${j.org})`; })
          .catch((e: Error) => `no pude ver la IP (${e.message.split("\n")[0]})`);
        log(`Saliendo por proxy ${new globalThis.URL(proxy.server).host}: ${salida}`);
      }
      log(`Abriendo ${URL}`);
      // "networkidle" nunca llega en el sitio de la TGR (scripts que siguen cargando), así que esperamos el HTML y un margen fijo.
      await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForTimeout(5_000);
      const title = await page.title();
      log(`TGR respondió: "${title}" (${page.url()})`);
      await save("_exploracion/tgr-1.png", await page.screenshot({ fullPage: true }));
      await save("_exploracion/tgr-1.html", await page.content());
      const links = await page.$$eval("a, button, iframe", (els) =>
        els.map((e) => `${e.tagName} ${(e as HTMLElement).innerText?.trim().replace(/\s+/g, " ") ?? ""} -> ${
          (e as HTMLAnchorElement).href || (e as HTMLIFrameElement).src || ""}`),
      );
      await save("_exploracion/tgr-1-enlaces.txt", `${page.url()}\n${title}\n\n${links.join("\n")}`);

      if (/no encontrada|no existe/i.test(title)) {
        return { status: "REQUIERE_ACCION", detail: "La TGR no mostró el trámite (página no encontrada)." };
      }
      return { status: "REQUIERE_ACCION", detail: "Ruta de la TGR en grabación: guardamos la página del trámite para automatizarla." };
    } finally {
      await browser.close();
    }
  },
};
