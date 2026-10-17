import type { ItemStatus, RequestStatus } from "@prisma/client";

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  BORRADOR: "Borrador",
  PENDIENTE_PAGO: "Pendiente de pago",
  PAGADA: "Pagada, en cola",
  EN_PROCESO: "Obteniendo documentos",
  GENERANDO_INFORME: "Generando informe",
  COMPLETADA: "Lista",
  CANCELADA: "Cancelada",
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  PENDIENTE: "Pendiente",
  OBTENIENDO: "Obteniendo",
  OBTENIDO: "Obtenido",
  REQUIERE_ACCION: "En revisión",
  FALLIDO: "Reintentando",
};
