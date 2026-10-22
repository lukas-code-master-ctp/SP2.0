import type { Browser, BrowserContextOptions } from "playwright";

// El Chromium sin ventana se anuncia como "HeadlessChrome" y hay emisores que lo rechazan: la TGR responde
// "AccessDenied" (o "Página no encontrada") a ese User-Agent aunque la IP sea chilena. Nos presentamos como el
// Chrome de escritorio de la misma versión que corre el motor.
export function contextOptions(browser: Browser): BrowserContextOptions {
  const major = browser.version().split(".")[0];
  return {
    locale: "es-CL",
    viewport: { width: 1280, height: 900 },
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`,
  };
}
