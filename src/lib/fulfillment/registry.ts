import type { Connector } from "./types";
import { siiAvaluo } from "./connectors/sii-avaluo";
import { tgrDeuda } from "./connectors/tgr-deuda";

const CONNECTORS: Connector[] = [siiAvaluo, tgrDeuda];

export function connectorFor(documentCode: string): Connector | undefined {
  return CONNECTORS.find((c) => c.documentCode === documentCode);
}
