export type PropertyRef = {
  requestNumber: number;
  rol: string; // "502-259"
  manzana: string;
  predio: string;
  comuna: string;
  region: string;
  /** Número oficial de la región (13 = Metropolitana), igual que Region.id. */
  regionId: number;
  foja: string | null;
  inscripcionNumero: string | null;
  inscripcionAnio: number | null;
  propietarioRun: string | null;
};

export type ConnectorContext = {
  property: PropertyRef;
  /** Guarda un archivo en la carpeta de la solicitud y devuelve su ruta relativa. */
  save: (name: string, content: Uint8Array | string) => Promise<string>;
  log: (message: string) => void;
};

export type ConnectorResult =
  | { status: "OBTENIDO"; filePath: string; detail?: string }
  // Falta un dato, hay captcha o la ruta aún no está grabada: queda para revisión humana.
  | { status: "REQUIERE_ACCION"; detail: string };

export type Connector = {
  /** Código del DocumentType que resuelve. */
  documentCode: string;
  name: string;
  /** Tope de tiempo del intento; por defecto el del motor. Para sitios lentos (el SERVIU tarda minutos). */
  timeoutMs?: number;
  /** Lanza un error si falla de forma reintentable (sitio caído, timeout, respuesta inesperada). */
  obtain: (ctx: ConnectorContext) => Promise<ConnectorResult>;
};
