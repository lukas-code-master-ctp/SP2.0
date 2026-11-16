/** Si un documento se puede pedir por internet en una comuna. */
export type Estado = "DISPONIBLE" | "NO_DISPONIBLE" | "POR_CONFIRMAR";

export type Disponibilidad = { estado: Estado; motivo: string };
