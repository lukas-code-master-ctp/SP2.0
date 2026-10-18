import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentOutcome } from "./explorer";

const memory = new Map<string, Record<string, unknown>>();
vi.mock("../../db", () => ({
  prisma: {
    agentMemory: {
      findUnique: async ({ where }: { where: { documentCode: string } }) => memory.get(where.documentCode) ?? null,
      upsert: async ({ where, create, update }: { where: { documentCode: string }; create: object; update: object }) => {
        const prev = memory.get(where.documentCode);
        const next = prev ? { ...prev, ...update, successes: 1 } : { lessons: [], recipe: null, ...create };
        memory.set(where.documentCode, next);
      },
    },
  },
}));

const runs: (string | undefined)[] = [];
let outcomes: AgentOutcome[] = [];
vi.mock("./explorer", () => ({
  runExplorerAgent: async (_doc: unknown, _ctx: unknown, guia?: string) => {
    runs.push(guia);
    return outcomes.shift();
  },
}));

const { obtainWithAgent, SiteDownError } = await import("./self-heal");

const doc = { code: "X", name: "X", description: "", issuer: "" };
const ctx = { property: {} as never, save: async () => "", log: () => {} };
const fail = (motivo: AgentOutcome["motivo"], resumen = "falló"): AgentOutcome => ({
  result: { status: "REQUIERE_ACCION", detail: resumen },
  motivo,
  resumen,
  steps: [],
});
const ok: AgentOutcome = {
  result: { status: "OBTENIDO", filePath: "x.pdf" },
  motivo: null,
  resumen: "listo",
  steps: [{ paso: 1, herramienta: "clic", argumentos: { id: "0.3" }, elemento: 'button "Buscar"', url: "https://a.cl", resultado: "ok" }],
};

beforeEach(() => {
  memory.clear();
  runs.length = 0;
});

describe("obtainWithAgent", () => {
  it("reintenta al tiro con la lección cuando no encontró la ruta", async () => {
    outcomes = [fail("ruta_no_encontrada", "no vi el botón"), ok];
    const result = await obtainWithAgent(doc, ctx);
    expect(result.status).toBe("OBTENIDO");
    expect(runs).toHaveLength(2);
    expect(runs[1]).toContain("no vi el botón");
  });

  it("no insiste si falta un login o un dato", async () => {
    outcomes = [fail("login_o_pago")];
    const result = await obtainWithAgent(doc, ctx);
    expect(result.status).toBe("REQUIERE_ACCION");
    expect(runs).toHaveLength(1);
  });

  it("avisa al motor que reintente más tarde si el sitio está caído", async () => {
    outcomes = [fail("sitio_caido")];
    await expect(obtainWithAgent(doc, ctx)).rejects.toBeInstanceOf(SiteDownError);
  });

  it("guarda la ruta exitosa y la usa como guía la próxima vez", async () => {
    outcomes = [ok, ok];
    await obtainWithAgent(doc, ctx);
    await obtainWithAgent(doc, ctx);
    expect(runs[1]).toContain('clic en button "Buscar"');
    expect(runs[1]).not.toContain("0.3");
  });
});
