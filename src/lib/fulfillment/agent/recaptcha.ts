import type { Frame, Page } from "playwright";

// Resolvedor del reCAPTCHA v2 de imágenes, al estilo de github.com/aydinnyunus/ai-captcha-bypass: en vez de que el
// agente converse con el desafío paso a paso (lento: caducaba, y a veces volvía a marcar la casilla y lo reiniciaba),
// un programa fijo lee la instrucción, recorta cada casilla y le pregunta al modelo por todas a la vez si muestran el
// objeto pedido. Luego marca las que sí, revisa las imágenes nuevas que aparezcan y aprieta VERIFICAR.

const visionModel = () => process.env.OPENROUTER_CAPTCHA_MODEL ?? "google/gemini-3.8-flash";
const MAX_ROUNDS = 8;
const DEADLINE_MS = 110_000; // el desafío caduca a los 2 minutos

export async function solveRecaptcha(page: Page, apiKey: string, log: (m: string) => void): Promise<string> {
  const result = await solve(page, apiKey, log).catch((e: Error) => `No se pudo resolver el reCAPTCHA: ${e.message.split("\n")[0]}`);
  log(`Captcha: ${result}`);
  return result;
}

async function solve(page: Page, apiKey: string, log: (m: string) => void): Promise<string> {
  // Por el proxy, los marcos de Google tardan en aparecer: si se mira de inmediato, parece que no hay captcha.
  const anchor = await waitForFrame(page, ["/recaptcha/api2/anchor", "/recaptcha/enterprise/anchor"], 15_000);
  if (!anchor) return "No hay un reCAPTCHA \"No soy un robot\" en la página.";
  if (await solved(anchor)) return "El reCAPTCHA ya está resuelto.";
  if (process.env.TWOCAPTCHA_API_KEY) return solveWithService(page, anchor, process.env.TWOCAPTCHA_API_KEY, log);
  await anchor.locator("#recaptcha-anchor").waitFor({ state: "visible", timeout: 15_000 });
  await anchor.click("#recaptcha-anchor", { timeout: 10_000 });

  const start = Date.now();
  for (let round = 1; round <= MAX_ROUNDS && Date.now() - start < DEADLINE_MS; round++) {
    const challenge = page.frames().find((f) => f.url().includes("/bframe"));
    const tiles = challenge
      ? await challenge.waitForSelector("td.rc-imageselect-tile", { state: "visible", timeout: 8_000 }).then(() => true, () => false)
      : false;
    if (await solved(anchor)) return "reCAPTCHA resuelto.";
    if (!challenge || !tiles) {
      const text = challenge ? await challenge.locator("body").innerText().catch(() => "") : "";
      if (/try again later|automated queries|consultas automatizadas|inténtalo de nuevo más tarde/i.test(text)) {
        return "Google bloqueó el reCAPTCHA para esta conexión (pide intentarlo más tarde).";
      }
      continue;
    }
    await page.waitForTimeout(1_000); // las imágenes entran con una animación

    const instruction = (await challenge.locator(".rc-imageselect-desc-wrapper").innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    const target = (await challenge.locator(".rc-imageselect-desc-wrapper strong").first().innerText().catch(() => "")).trim();
    const dynamic = /none left|no quede ninguna|no queden/i.test(instruction);
    const cells = challenge.locator("td.rc-imageselect-tile");
    const count = await cells.count();
    log(`Captcha ronda ${round}: "${instruction}" (${count} casillas)`);

    let pending = [...Array(count).keys()];
    // En los desafíos "hasta que no quede ninguna", cada casilla marcada se reemplaza por otra imagen que hay que revisar.
    for (let pass = 0; pass < 4 && pending.length; pass++) {
      const hits = await classify(challenge, pending, target || instruction, count, apiKey);
      for (const i of hits) {
        await cells.nth(i).click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(200 + Math.random() * 300);
      }
      log(`Captcha: marcó ${hits.length ? hits.map((i) => i + 1).join(", ") : "ninguna"}`);
      if (!dynamic || !hits.length) break;
      // La imagen nueva llega cuando la casilla deja de estar "dynamic-selected" (unos 4 s, más por el proxy). Antes se
      // esperaba un tiempo fijo y a veces se volvía a mirar la imagen vieja: marcaba la misma casilla una y otra vez.
      await challenge
        .waitForFunction(
          (idx) => {
            const tds = [...document.querySelectorAll("td.rc-imageselect-tile")];
            return idx.every((i) => tds[i] && !tds[i].classList.contains("rc-imageselect-dynamic-selected"));
          },
          hits,
          { timeout: 20_000 },
        )
        .catch(() => {});
      await page.waitForTimeout(1_000);
      pending = hits;
    }

    await challenge.click("#recaptcha-verify-button", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(2_500);
    if (await solved(anchor)) return "reCAPTCHA resuelto.";
  }
  return "No se pudo resolver el reCAPTCHA (Google siguió pidiendo desafíos o caducó).";
}

// Resolución por servicio (2Captcha): se le manda la clave del sitio y la URL, y devuelve el token que Google habría
// puesto en el formulario. Desde un servidor, nuestro resolvedor con Gemini nunca convenció a Google (1016: hasta 7
// rondas sin aceptar), así que si hay clave del servicio se usa esta vía.
const SERVICE_URL = "https://api.2captcha.com";
const SERVICE_DEADLINE_MS = 150_000;

async function solveWithService(page: Page, anchor: Frame, clientKey: string, log: (m: string) => void): Promise<string> {
  const siteKey = new URL(anchor.url()).searchParams.get("k");
  if (!siteKey) return "No se encontró la clave del sitio del reCAPTCHA.";
  log("Captcha: pidiendo la resolución a 2Captcha…");
  const task = await serviceCall<{ taskId: number }>(clientKey, "createTask", {
    task: { type: "RecaptchaV2TaskProxyless", websiteURL: page.url(), websiteKey: siteKey },
  });

  const start = Date.now();
  while (Date.now() - start < SERVICE_DEADLINE_MS) {
    await page.waitForTimeout(5_000);
    const res = await serviceCall<{ status: string; solution?: { gRecaptchaResponse: string } }>(clientKey, "getTaskResult", { taskId: task.taskId });
    if (res.status !== "ready" || !res.solution) continue;
    await injectToken(page, res.solution.gRecaptchaResponse);
    await page.waitForTimeout(1_000);
    return "reCAPTCHA resuelto (token puesto en el formulario; la casilla puede no verse marcada). Envía el formulario.";
  }
  return "2Captcha no entregó la respuesta a tiempo.";
}

async function serviceCall<T>(clientKey: string, method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SERVICE_URL}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientKey, ...body }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`2Captcha respondió ${res.status}`);
  const data = (await res.json()) as T & { errorId: number; errorCode?: string; errorDescription?: string };
  if (data.errorId) throw new Error(`2Captcha: ${data.errorCode ?? data.errorId}${data.errorDescription ? ` (${data.errorDescription})` : ""}`);
  return data;
}

// Deja el token donde lo deja Google (textarea g-recaptcha-response) y, si el sitio registró un callback, lo llama.
// Va como texto, no como función: tsx (esbuild) envuelve las funciones internas con un ayudante __name que no existe en
// el navegador y page.evaluate fallaba con "ReferenceError: __name is not defined" (igual que MARK_SCRIPT en explorer.ts).
function injectToken(page: Page, token: string) {
  return page.evaluate(`((tok) => {
    document.querySelectorAll('textarea[name="g-recaptcha-response"], #g-recaptcha-response').forEach((t) => {
      t.value = tok;
      t.innerHTML = tok;
    });
    const named = document.querySelector(".g-recaptcha[data-callback]")?.getAttribute("data-callback");
    if (named && typeof window[named] === "function") window[named](tok);
    const cfg = window.___grecaptcha_cfg;
    const seen = new Set();
    const find = (o, depth) => {
      if (!o || typeof o !== "object" || seen.has(o) || depth > 6) return null;
      seen.add(o);
      try {
        for (const v of Object.values(o)) {
          if (typeof v === "function" && o.callback === v) return v;
          const r = find(v, depth + 1);
          if (r) return r;
        }
      } catch {
        // objetos de otro origen (marcos de Google) no se pueden recorrer
      }
      return null;
    };
    for (const client of Object.values((cfg && cfg.clients) || {})) {
      const cb = find(client, 0);
      if (cb) {
        cb(tok);
        break;
      }
    }
  })(${JSON.stringify(token)})`);
}

async function waitForFrame(page: Page, needles: string[], ms: number): Promise<Frame | null> {
  const until = Date.now() + ms;
  do {
    const frame = page.frames().find((f) => needles.some((n) => f.url().includes(n)));
    if (frame) return frame;
    await page.waitForTimeout(500);
  } while (Date.now() < until);
  return null;
}

function solved(anchor: Frame) {
  return anchor.locator("#recaptcha-anchor").getAttribute("aria-checked", { timeout: 2_000 }).then((v) => v === "true", () => false);
}

// Pregunta por todas las casillas en paralelo. Si la del modelo falla, la casilla se cuenta como "no".
async function classify(frame: Frame, indexes: number[], target: string, count: number, apiKey: string): Promise<number[]> {
  const split = count === 16; // en 4x4 es una sola foto partida: el objeto puede asomar solo en parte
  const answers = await Promise.all(
    indexes.map(async (i) => {
      const png = await frame.locator("td.rc-imageselect-tile").nth(i).screenshot({ timeout: 5_000 }).catch(() => null);
      if (!png) return false;
      const question = split
        ? `This is one square cut from a larger photo. Does any part of a "${target}" appear in this square, even a small piece? Answer only yes or no.`
        : `Does this image show a "${target}"? Answer only yes or no.`;
      return ask(apiKey, question, png).then((a) => /^\s*(yes|s[ií])/i.test(a), () => false);
    }),
  );
  return indexes.filter((_, k) => answers[k]);
}

async function ask(apiKey: string, question: string, png: Buffer): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: visionModel(),
      // Gemini Flash razona antes de contestar: sin bajarle el esfuerzo, con pocos tokens devuelve la respuesta vacía.
      max_tokens: 300,
      reasoning: { effort: "minimal" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: question },
            { type: "image_url", image_url: { url: `data:image/png;base64,${png.toString("base64")}` } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`OpenRouter respondió ${res.status}`);
  const data = (await res.json()) as { choices: { message: { content?: string } }[] };
  return data.choices[0]?.message.content ?? "";
}
