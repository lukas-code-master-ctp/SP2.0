import type { Connector } from "./types";
import { siiAvaluo } from "./connectors/sii-avaluo";
import { serviuNoExpropiacion } from "./connectors/serviu-no-expropiacion";
import { tgrDeuda } from "./connectors/tgr-deuda";

const CONNECTORS: Connector[] = [siiAvaluo, tgrDeuda, serviuNoExpropiacion];

export function connectorFor(documentCode: string): Connector | undefined {
  return CONNECTORS.find((c) => c.documentCode === documentCode);
}
