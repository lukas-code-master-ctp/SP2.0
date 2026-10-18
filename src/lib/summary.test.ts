import { describe, expect, it } from "vitest";
import { summarize, summarizeEvent } from "./summary";

describe("summarize", () => {
  it("deja igual un texto corto", () => {
    expect(summarize("Obtenido por el agente.")).toBe("Obtenido por el agente.");
  });
  it("no toca los textos cortos ya escritos para el cliente", () => {
    const sii = "Ficha con los datos públicos del SII. El certificado detallado oficial requiere la clave del propietario.";
    expect(summarize(sii)).toBe(sii);
  });
  it("resume captchas", () => {
    expect(summarize(`Agente: El sitio del Registro Civil muestra un captcha de imagen ("¿Cuál es el código?") que no se pudo resolver. ${"Pasos para una persona. ".repeat(6)}`)).toBe(
      "El sitio pide un captcha; lo completa nuestro equipo.",
    );
  });
  it("resume la salida larga del agente sin regla específica", () => {
    expect(summarize(`Agente: No encontré el formulario. ${"Detalle técnico. ".repeat(12)}`)).toBe(
      "No pudimos obtenerlo automáticamente; lo revisa nuestro equipo.",
    );
  });
  it("corta textos largos sin regla", () => {
    const out = summarize("x".repeat(400));
    expect(out.length).toBeLessThanOrEqual(140);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("summarizeEvent", () => {
  it("resume intentos fallidos sin el error técnico", () => {
    expect(summarizeEvent("Certificado de deuda de contribuciones: intento 3 falló (Sitio caído: No pude obtener el…).")).toBe(
      "Certificado de deuda de contribuciones: intento 3 sin éxito.",
    );
  });
  it("conserva el nombre del documento y resume el detalle", () => {
    const msg = `Certificado de deuda de derechos de aseo: Agente: No pude obtener el certificado. El portal pide RUT y muestra un captcha de reCAPTCHA ("No soy un robot") que no puedo resolver. ${"x".repeat(200)}`;
    expect(summarizeEvent(msg)).toBe("Certificado de deuda de derechos de aseo: El sitio pide un captcha; lo completa nuestro equipo.");
  });
});
