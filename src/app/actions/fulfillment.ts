"use server";

import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth";
import { getOwnedRequest } from "@/lib/requests";
import { retryFulfillment as requeue } from "@/lib/fulfillment";

/** Vuelve a poner en cola los documentos con problemas (útil mientras se graban las rutas de cada emisor). */
export async function retryFulfillment(formData: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const request = await getOwnedRequest(String(formData.get("requestId") ?? ""), user.id);
  if (request.status === "PAGADA" || request.status === "EN_PROCESO") await requeue(request.id);
  revalidatePath(`/app/solicitudes/${request.id}`);
}
