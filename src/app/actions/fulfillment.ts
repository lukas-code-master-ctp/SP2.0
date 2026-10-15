"use server";

import { revalidatePath } from "next/cache";
import { requireOnboardedUser } from "@/lib/auth";
import { getOwnedRequest } from "@/lib/requests";
import { retryRequest } from "@/lib/fulfillment";

/** Vuelve a intentar los documentos con problemas (útil mientras se graban las rutas de cada emisor). */
export async function retryFulfillment(formData: FormData): Promise<void> {
  const user = await requireOnboardedUser();
  const request = await getOwnedRequest(String(formData.get("requestId") ?? ""), user.id);
  if (request.status === "PAGADA" || request.status === "EN_PROCESO") {
    void retryRequest(request.id).catch((e) => console.error(`[obtención] ${request.id}`, e));
  }
  revalidatePath(`/app/solicitudes/${request.id}`);
}
