/** Si un documento se puede pedir a distancia (en línea o por correo) en una comuna. */
export type Estado = "DISPONIBLE" | "NO_DISPONIBLE";

export type Disponibilidad = { estado: Estado; motivo: string };
