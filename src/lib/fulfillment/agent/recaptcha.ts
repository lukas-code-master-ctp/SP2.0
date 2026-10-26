import type { Frame, Page } from "playwright";

// Resolvedor del reCAPTCHA v2 de imágenes, al estilo de github.com/aydinnyunus/ai-captcha-bypass: en vez de que el
// agente converse con el desafío paso a paso (lento: caducaba, y a veces volvía a marcar la casilla y lo reiniciaba),
// un programa fijo lee la instrucción, recorta cada casilla y le pregunta al modelo por todas a la vez si muestran el
// objeto pedido. Luego marca las que sí, revisa las imágenes nuevas que aparezcan y aprieta VERIFICAR.

const visionModel = () => process.env.OPENROUTER_CAPTCHA_MODEL ?? "google/gemini-3.8-flash";
const MAX_ROUNDS = 8;
const DEADLINE_MS = 110_000; // el desafío caduca a los 2 minutos

export async function solveRecaptcha(page: Page, apiKey: string, log: (m: string) => void): Promise<string> {
  const anchor = page.frames().find((f) => f.url().includes("/recaptcha/api2/anchor") || f.url().includes("/recaptcha/enterprise/anchor"));
  if (!anchor) return "No hay un reCAPTCHA \"No soy un robot\" en la página.";
  if (await solved(anchor)) return "El reCAPTCHA ya está resuelto.";
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
      await page.waitForTimeout(4_500); // las imágenes nuevas tardan en aparecer
      pending = hits;
    }

    await challenge.click("#recaptcha-verify-button", { timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(2_500);
    if (await solved(anchor)) return "reCAPTCHA resuelto.";
  }
  return "No se pudo resolver el reCAPTCHA (Google siguió pidiendo desafíos o caducó).";
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
