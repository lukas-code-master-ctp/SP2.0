import { afterEach, describe, expect, it, vi } from "vitest";
import { redact } from "./explorer";

describe("redact", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("oculta el RUN y el documento del representante en cualquier formato", () => {
    vi.stubEnv("COMPANY_REP_RUN", "12.345.678-5");
    vi.stubEnv("COMPANY_REP_DOC", "111.222.333");
    const text = "RUN 12.345.678-5, 123456785, 12345678 y documento 111222333 o 111.222.333; rol 502-259";
    expect(redact(text)).toBe(
      "RUN [dato del representante], [dato del representante], [dato del representante] y documento [dato del representante] o [dato del representante]; rol 502-259",
    );
  });

  it("no cambia nada si no hay representante", () => {
    vi.stubEnv("COMPANY_REP_RUN", "");
    vi.stubEnv("COMPANY_REP_DOC", "");
    expect(redact("RUN 12.345.678-5")).toBe("RUN 12.345.678-5");
  });
});
