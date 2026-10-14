// Fase 3: generación del borrador de informe con un LLM vía OpenRouter (API compatible con OpenAI).
// No está conectado al flujo del MVP; se deja implementado para probarlo de forma aislada.

export type ReportInput = {
  procedureName: string;
  reportName: string;
  property: { rol: string; comuna: string; region: string };
  /** Texto extraído (OCR) de cada documento obtenido. */
  documents: { name: string; text: string }[];
};

const SYSTEM_PROMPT = `Eres un abogado chileno especialista en estudio de títulos de bienes raíces.
Redactas borradores de informes a partir de los documentos entregados, citando el documento que respalda cada afirmación.
Si falta información o hay inconsistencias, lo indicas explícitamente como observación. No inventas datos.`;

export async function generateReport(input: ReportInput): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENROUTER_API_KEY");

  const docs = input.documents.map((d) => `### ${d.name}\n${d.text}`).join("\n\n");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content:
            `Redacta un ${input.reportName} (${input.procedureName}) para la propiedad rol ${input.property.rol}, ` +
            `comuna de ${input.property.comuna}, región ${input.property.region}.\n\nDocumentos:\n\n${docs}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter respondió ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0]?.message.content ?? "";
}
