import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { pdfText } from "./tgr-deuda";

function pdfWith(content: string): Buffer {
  const stream = deflateSync(Buffer.from(content, "latin1"));
  return Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj\n<</Filter/FlateDecode>>stream\n"), stream, Buffer.from("\nendstream\nendobj\n")]);
}

describe("pdfText", () => {
  it("lee las líneas de texto de los streams comprimidos", () => {
    const pdf = pdfWith("BT /F1 9 Tf (ESTE ROL LAS CONDES 071-00502-259 NO REGISTRA DEUDA)Tj ET\nBT (Rol \\(071\\))Tj ET");
    expect(pdfText(pdf).split("\n")).toEqual(["ESTE ROL LAS CONDES 071-00502-259 NO REGISTRA DEUDA", "Rol \\(071\\)"]);
  });

  it("ignora streams que no son Flate", () => {
    expect(pdfText(Buffer.from("%PDF-1.4\nstream\nbinario\nendstream\n"))).toBe("");
  });
});
