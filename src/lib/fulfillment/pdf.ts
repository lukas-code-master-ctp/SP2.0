import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/** Ficha simple en PDF con título, filas etiqueta/valor y notas al pie. */
export async function buildSheetPdf(title: string, subtitle: string, rows: [string, string][], notes: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const margin = 50;
  let y = 790;

  page.drawText(title, { x: margin, y, size: 16, font: bold, color: rgb(0.1, 0.2, 0.45) });
  y -= 20;
  page.drawText(subtitle, { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 30;

  for (const [label, value] of rows) {
    page.drawText(label, { x: margin, y, size: 10, font: bold });
    for (const line of wrap(value, font, 10, 300)) {
      page.drawText(line, { x: margin + 200, y, size: 10, font });
      y -= 14;
    }
    y -= 4;
  }

  y -= 16;
  for (const note of notes) {
    for (const line of wrap(note, font, 8, 495)) {
      page.drawText(line, { x: margin, y, size: 8, font, color: rgb(0.35, 0.35, 0.35) });
      y -= 11;
    }
    y -= 4;
  }
  return doc.save();
}

function wrap(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(/\s+/)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
