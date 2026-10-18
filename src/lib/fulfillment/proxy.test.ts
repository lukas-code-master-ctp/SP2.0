import { afterEach, describe, expect, it } from "vitest";
import { proxyFor } from "./proxy";

afterEach(() => {
  delete process.env.PROXY_CL_URL;
  delete process.env.PROXY_CL_DOCS;
});

describe("proxyFor", () => {
  it("sin proxy configurado, todo va directo", () => {
    expect(proxyFor("DEUDA_CONTRIBUCIONES")).toBeUndefined();
  });

  it("solo TGR sale por el proxy por defecto, con usuario y clave separados", () => {
    process.env.PROXY_CL_URL = "http://user-cl:cla%40ve@proxy.ejemplo.com:8000";
    expect(proxyFor("DEUDA_CONTRIBUCIONES")).toEqual({ server: "http://proxy.ejemplo.com:8000", username: "user-cl", password: "cla@ve" });
    expect(proxyFor("NO_EXPROPIACION_SERVIU")).toBeUndefined();
  });

  it("PROXY_CL_DOCS elige qué documentos usan el proxy", () => {
    process.env.PROXY_CL_URL = "http://proxy.ejemplo.com:8000";
    process.env.PROXY_CL_DOCS = "DEUDA_ASEO, MATRIMONIO";
    expect(proxyFor("DEUDA_ASEO")?.server).toBe("http://proxy.ejemplo.com:8000");
    expect(proxyFor("DEUDA_CONTRIBUCIONES")).toBeUndefined();
  });
});
