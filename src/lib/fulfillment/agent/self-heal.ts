import type { Prisma } from "@prisma/client";
import { prisma } from "../../db";
import type { ConnectorContext, ConnectorResult } from "../types";
import { runExplorerAgent, type AgentDocument, type AgentOutcome, type Motivo, type Step } from "./explorer";

// Autoarreglo: el agente recuerda por documento la última ruta que funcionó y por qué fallaron los últimos
// intentos. Si un intento falla por algo que el agente puede corregir (no encontró la ruta, se perdió), lo
// vuelve a intentar al tiro con esa lección. Si el sitio está caído, el motor reintenta más tarde. Si falta
// un dato, un login, un pago o un captcha, no tiene sentido insistir: queda para el equipo.

const MAX_LESSONS = 5;
const RETRY_NOW: Motivo[] = ["ruta_no_encontrada", "otro"];

type Lesson = { fecha: string; motivo: Motivo; resumen: string };
type Recipe = { pasos: Pick<Step, "herramienta" | "argumentos" | "elemento" | "url">[] };

export class SiteDownError extends Error {}

export async function obtainWithAgent(doc: AgentDocument, ctx: ConnectorContext): Promise<ConnectorResult> {
  let outcome = await runExplorerAgent(doc, ctx, await guidance(doc.code));
  await remember(doc.code, outcome);

  if (outcome.motivo && RETRY_NOW.includes(outcome.motivo)) {
    ctx.log("El agente no lo logró; reintenta con lo aprendido.");
    outcome = await runExplorerAgent(doc, ctx, await guidance(doc.code));
    await remember(doc.code, outcome);
  }
  // El motor captura el error y vuelve a encolar el documento con espera.
  if (outcome.motivo === "sitio_caido") throw new SiteDownError(`Sitio caído: ${outcome.resumen}`.slice(0, 300));
  return outcome.result;
}

/** Texto para el agente con la receta que funcionó y los errores recientes. */
async function guidance(documentCode: string): Promise<string | undefined> {
  const memory = await prisma.agentMemory.findUnique({ where: { documentCode } });
  if (!memory) return undefined;
  const parts: string[] = [];
  const recipe = memory.recipe as Recipe | null;
  if (recipe?.pasos.length) {
    const pasos = recipe.pasos.map((p, i) => `${i + 1}. ${describeStep(p)}`).join("\n");
    parts.push(
      `Ruta que funcionó la última vez (úsala como guía; los ids de los elementos cambian, guíate por la URL y el texto, y usa los datos de esta propiedad):\n${pasos}`,
    );
  }
  const lessons = memory.lessons as Lesson[];
  if (lessons.length) {
    parts.push(`Intentos recientes que fallaron (evita repetir lo mismo):\n${lessons.map((l) => `- [${l.motivo}] ${l.resumen}`).join("\n")}`);
  }
  return parts.join("\n\n") || undefined;
}

function describeStep(p: Recipe["pasos"][number]): string {
  const rest = { ...p.argumentos };
  delete rest.id;
  const args = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
  return `${p.herramienta}${p.elemento ? ` en ${p.elemento}` : ""}${args} (en ${p.url})`;
}

async function remember(documentCode: string, outcome: AgentOutcome) {
  const solved = outcome.result.status === "OBTENIDO" || (outcome.motivo === null && outcome.steps.length > 0);
  if (solved) {
    const recipe: Recipe = {
      pasos: outcome.steps
        .filter((s) => s.herramienta !== "captura" && !s.resultado.startsWith("Error"))
        .map(({ herramienta, argumentos, elemento, url }) => ({ herramienta, argumentos, elemento, url })),
    };
    const data = { recipe: recipe as unknown as Prisma.InputJsonValue, recipeAt: new Date(), lessons: [] };
    await prisma.agentMemory.upsert({
      where: { documentCode },
      create: { documentCode, successes: 1, ...data },
      update: { successes: { increment: 1 }, ...data },
    });
    return;
  }
  if (!outcome.motivo) return; // sin agente o sin navegador: no hay nada que aprender
  const current = await prisma.agentMemory.findUnique({ where: { documentCode } });
  const lesson: Lesson = { fecha: new Date().toISOString(), motivo: outcome.motivo, resumen: outcome.resumen.slice(0, 400) };
  const lessons = [...((current?.lessons as Lesson[] | undefined) ?? []), lesson].slice(-MAX_LESSONS);
  await prisma.agentMemory.upsert({
    where: { documentCode },
    create: { documentCode, lessons },
    update: { lessons },
  });
}
