import { cleanRut } from "../../rut";
import { contextOptions } from "../browser";
import { proxyFor } from "../proxy";
import type { Connector } from "../types";
import { normalizeName } from "./sii-avaluo";

// Certificado de No Expropiación del MINVU/SERVIU (https://cne.minvu.cl), gratis y sin captcha.
// Paso 1: datos del solicitante (acepta el RUT de empresa marcando la casilla) y rol. Paso 2: confirma el rol.
// Paso 3: lista de solicitudes; la nueva queda "Certificada" al tiro y su PDF se abre desde "Listar Certificados".
// El sitio tarda 30 a 60 s en cada paso: el agente se cortaba antes y repetía la solicitud sin descargarla.
const FORM = "https://cne.minvu.cl/Public/IngresarSolicitud.aspx";
const SLOW_MS = 180_000;

export const serviuNoExpropiacion: Connector = {
  documentCode: "NO_EXPROPIACION_SERVIU",
  name: "MINVU · Certificado de no expropiación",
  async obtain({ property, save, log }) {
    const { COMPANY_RUT, COMPANY_EMAIL, COMPANY_NAME } = process.env;
    if (!COMPANY_RUT || !COMPANY_EMAIL) {
      return { status: "REQUIERE_ACCION", detail: "Faltan los datos del solicitante (COMPANY_RUT y COMPANY_EMAIL)." };
    }
    const rut = cleanRut(COMPANY_RUT);

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
        proxy: proxyFor("NO_EXPROPIACION_SERVIU"),
      });
    } catch {
      return { status: "REQUIERE_ACCION", detail: "Falta instalar el navegador automático (npx playwright install chromium)." };
    }
    try {
      const context = await browser.newContext(contextOptions(browser));
      const page = await context.newPage();
      page.on("dialog", (d) => {
        log(`SERVIU avisó: ${d.message()}`);
        void d.accept();
      });

      log(`Abriendo formulario SERVIU (región ${property.regionId}, ${property.comuna}, rol ${property.rol})`);
      await page.goto(FORM, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.check("#chkEsEmpresa");
      await page.fill("#txtRut_txtValor", rut.slice(0, -1));
      await page.fill("#txtRut_txtValorDV", rut.slice(-1));
      await page.fill("#txtEmail_txtValor", COMPANY_EMAIL);

      // Los valores del selector de región son el número oficial de la región, igual que Region.id.
      // Elegirla recarga la página con las comunas de esa región.
      await page.selectOption("#cbRegion_cmbValor", String(property.regionId));
      const target = normalizeName(property.comuna);
      let comuna: string | undefined;
      for (let i = 0; i < 30 && !comuna; i++) {
        await page.waitForTimeout(2_000);
        const options = await page
          .$$eval("#cbComuna_cmbValor option", (os) => os.map((o) => ({ value: (o as HTMLOptionElement).value, label: o.textContent ?? "" })))
          .catch(() => []);
        comuna = options.find((o) => normalizeName(o.label) === target)?.value;
      }
      if (!comuna) return { status: "REQUIERE_ACCION", detail: `El SERVIU no tiene la comuna "${property.comuna}" en esa región.` };
      await page.selectOption("#cbComuna_cmbValor", comuna);
      await page.fill("#txtRol_txtManzana", property.manzana);
      await page.fill("#txtRol_txtPredio", property.predio);
      await page.fill("#IControl_NombreInstitucion_txtValor", COMPANY_NAME || "Estudio de títulos");

      await page.click("#btnIngresar", { noWaitAfter: true });
      const confirmed = await page
        .waitForSelector("#btnContinuar", { timeout: SLOW_MS })
        .then(() => true)
        .catch(() => false);
      if (!confirmed) {
        await save("_exploracion/serviu-paso-1.png", await page.screenshot({ fullPage: true }));
        const text = await page.locator("body").innerText().catch(() => "");
        if (/no existe|no se encontr|inv[aá]lid/i.test(text)) {
          return { status: "REQUIERE_ACCION", detail: `El SERVIU no reconoce el rol ${property.rol} en ${property.comuna}. Revisa el rol.` };
        }
        throw new Error("El SERVIU no confirmó el rol a tiempo");
      }
      const direccion = (await page.locator("body").innerText()).match(/Direcci[oó]n:\s*(.+)/)?.[1]?.trim();
      log(`SERVIU confirmó el rol: ${direccion ?? "(sin dirección)"}`);

      await page.click("#btnContinuar", { noWaitAfter: true });
      // La lista viene ordenada de la más nueva a la más antigua: la fila 0 es la recién creada.
      await page.waitForSelector("#dgSolicitudes_HyperLink2_0", { timeout: SLOW_MS });
      const estado = (await page.locator("#dgSolicitudes tr").nth(1).innerText().catch(() => "")).replace(/\s+/g, " ");
      // Recién creada puede figurar "Pagada" (es gratis) unos segundos antes de quedar "Certificada".
      if (!/Certificada|Pagada/i.test(estado)) {
        await save("_exploracion/serviu-lista.png", await page.screenshot({ fullPage: true }));
        return { status: "REQUIERE_ACCION", detail: `El SERVIU dejó la solicitud sin certificar (${estado.trim() || "sin estado"}).` };
      }

      // El enlace abre la lista de certificados por JavaScript y a veces se queda pegado; la URL directa carga en segundos.
      const href = (await page.getAttribute("#dgSolicitudes_HyperLink2_0", "href")) ?? "";
      const ids = href.match(/\((\d+)\s*,\s*(\d+)\)/);
      if (!ids) throw new Error(`El SERVIU cambió el enlace a los certificados (${href.slice(0, 80)})`);
      log(`SERVIU certificó la solicitud ${ids[1]}`);
      const listado = `https://cne.minvu.cl/Public/Certificado/ListadoAgrupaciones.aspx?IDS=${ids[1]}&IDU=${ids[2]}`;
      // En una pestaña nueva: la de la lista tiene navegaciones pendientes que cortan un goto.
      const certs = await context.newPage();
      let ready = false;
      for (let attempt = 1; attempt <= 6 && !ready; attempt++) {
        if (attempt > 1) await certs.waitForTimeout(15_000);
        ready = await certs
          .goto(listado, { waitUntil: "commit", timeout: SLOW_MS })
          .then(() => certs.waitForSelector("#dgAgrupacion_btnGenerarCertificado_0", { timeout: 60_000 }))
          .then(() => true)
          .catch(() => false);
      }
      if (!ready) throw new Error(`El SERVIU no generó el certificado de la solicitud ${ids[1]} a tiempo`);
      // "Ver certificado" abre el PDF en una pestaña nueva.
      const [pdfPage] = await Promise.all([
        context.waitForEvent("page", { timeout: SLOW_MS }),
        certs.click("#dgAgrupacion_btnGenerarCertificado_0", { noWaitAfter: true }),
      ]);
      await pdfPage.waitForURL(/\.pdf/i, { timeout: SLOW_MS });
      const res = await context.request.get(pdfPage.url(), { timeout: 60_000 });
      const pdf = Buffer.from(await res.body());
      if (pdf.subarray(0, 5).toString() !== "%PDF-") throw new Error("El SERVIU devolvió un certificado que no es PDF");
      const filePath = await save("serviu-no-expropiacion.pdf", pdf);
      log("Certificado SERVIU obtenido");
      return { status: "OBTENIDO", filePath, detail: "Certificado de no expropiación oficial (MINVU)." };
    } finally {
      await browser.close();
    }
  },
};
