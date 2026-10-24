// Catálogo inicial de documentos y trámites.
// IMPORTANTE: precios y requisitos son valores de referencia para el MVP.
// Deben validarse con el equipo legal y ajustarse por comuna/CBR antes de producción.

export type DocSeed = { code: string; name: string; description: string; issuer: string; price: number };

export const DOCUMENTOS: DocSeed[] = [
  {
    code: "DOMINIO_VIGENTE",
    name: "Copia de inscripción de dominio con vigencia",
    description: "Acredita quién es el dueño actual de la propiedad.",
    issuer: "Conservador de Bienes Raíces",
    price: 6500,
  },
  {
    code: "GP_30",
    name: "Certificado de hipotecas, gravámenes, interdicciones y prohibiciones (30 años)",
    description: "Informa hipotecas, embargos, servidumbres y prohibiciones vigentes sobre la propiedad.",
    issuer: "Conservador de Bienes Raíces",
    price: 7500,
  },
  {
    code: "TITULOS_ANTERIORES",
    name: "Copias de inscripciones anteriores (10 años)",
    description: "Cadena de títulos de los últimos 10 años, necesaria para revisar la historia del dominio.",
    issuer: "Conservador de Bienes Raíces",
    price: 13000,
  },
  {
    code: "ESCRITURA_ULTIMA",
    name: "Copia de escritura de la última transferencia",
    description: "Escritura pública con la que el actual dueño adquirió la propiedad.",
    issuer: "Notaría / Archivo Judicial",
    price: 8000,
  },
  {
    code: "AVALUO_DETALLADO",
    name: "Certificado de avalúo fiscal detallado",
    description: "Avalúo fiscal, destino y superficie según el SII.",
    issuer: "Servicio de Impuestos Internos (SII)",
    price: 0,
  },
  {
    code: "DEUDA_CONTRIBUCIONES",
    name: "Certificado de deuda de contribuciones",
    description: "Indica si la propiedad tiene contribuciones impagas.",
    issuer: "Tesorería General de la República (TGR)",
    price: 0,
  },
  {
    code: "NUMERO",
    name: "Certificado de número",
    description: "Acredita la numeración municipal de la propiedad.",
    issuer: "Dirección de Obras Municipales",
    price: 3000,
  },
  {
    code: "CIP",
    name: "Certificado de informaciones previas (CIP)",
    description: "Normas urbanísticas aplicables y afectaciones a utilidad pública.",
    issuer: "Dirección de Obras Municipales",
    price: 5000,
  },
  {
    code: "NO_EXPROPIACION_MUNICIPAL",
    name: "Certificado de no expropiación municipal",
    description: "Acredita que la propiedad no está afecta a expropiación municipal.",
    issuer: "Dirección de Obras Municipales",
    price: 3500,
  },
  {
    code: "NO_EXPROPIACION_SERVIU",
    name: "Certificado de no expropiación SERVIU",
    description: "Acredita que la propiedad no está afecta a expropiación por parte de SERVIU.",
    issuer: "SERVIU regional",
    price: 0,
  },
  {
    code: "RECEPCION_FINAL",
    name: "Certificado de recepción final de obras",
    description: "Acredita que las construcciones cuentan con permiso y recepción municipal.",
    issuer: "Dirección de Obras Municipales",
    price: 4000,
  },
  {
    code: "DEUDA_ASEO",
    name: "Certificado de deuda de derechos de aseo",
    description: "Indica si existen derechos de aseo domiciliario impagos.",
    issuer: "Municipalidad",
    price: 0,
  },
  {
    code: "MATRIMONIO",
    name: "Certificado de matrimonio del propietario",
    description: "Permite revisar el régimen patrimonial del vendedor.",
    issuer: "Registro Civil",
    price: 0,
  },
  {
    code: "POSESION_EFECTIVA",
    name: "Certificado de posesión efectiva",
    description: "Necesario si la propiedad proviene de una herencia.",
    issuer: "Registro Civil",
    // El Registro Civil lo cobra en su carro de certificados (pide el RUN del causante).
    price: 1250,
  },
  {
    code: "PLANO_ARCHIVADO",
    name: "Copia de plano archivado",
    description: "Plano de la propiedad o del loteo archivado en el Conservador.",
    issuer: "Conservador de Bienes Raíces",
    price: 7000,
  },
  {
    code: "REGLAMENTO_COPROPIEDAD",
    name: "Copia del reglamento de copropiedad",
    description: "Aplica a departamentos y condominios.",
    issuer: "Conservador de Bienes Raíces",
    price: 7000,
  },
];

export const TRAMITES = [
  {
    code: "INFORME_TITULO" as const,
    name: "Informe de títulos",
    description: "Revisión legal de la historia de la propiedad para una compraventa o un crédito hipotecario.",
    reportName: "Borrador de informe de títulos",
    reportPrice: 45000,
    documentos: [
      "DOMINIO_VIGENTE", "GP_30", "TITULOS_ANTERIORES", "ESCRITURA_ULTIMA", "AVALUO_DETALLADO", "DEUDA_CONTRIBUCIONES",
      "NUMERO", "NO_EXPROPIACION_MUNICIPAL", "NO_EXPROPIACION_SERVIU", "RECEPCION_FINAL", "DEUDA_ASEO", "MATRIMONIO",
    ],
  },
  {
    code: "SANEAMIENTO" as const,
    name: "Saneamiento de propiedad",
    description: "Identifica y regulariza problemas en los títulos o en la situación municipal de la propiedad.",
    reportName: "Informe de saneamiento",
    reportPrice: 60000,
    documentos: [
      "DOMINIO_VIGENTE", "GP_30", "TITULOS_ANTERIORES", "ESCRITURA_ULTIMA", "AVALUO_DETALLADO", "DEUDA_CONTRIBUCIONES",
      "CIP", "NO_EXPROPIACION_MUNICIPAL", "NO_EXPROPIACION_SERVIU", "RECEPCION_FINAL", "DEUDA_ASEO", "MATRIMONIO",
      "POSESION_EFECTIVA", "PLANO_ARCHIVADO", "REGLAMENTO_COPROPIEDAD",
    ],
  },
];
