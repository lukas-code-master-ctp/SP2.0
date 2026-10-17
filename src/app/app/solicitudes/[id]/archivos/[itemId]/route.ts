import path from "node:path";
import { requireOnboardedUser } from "@/lib/auth";
import { getOwnedRequest } from "@/lib/requests";
import { mimeFor, readStoredFile } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const user = await requireOnboardedUser();
  const request = await getOwnedRequest(id, user.id);
  const item = request.items.find((i) => i.id === itemId);
  if (!item?.filePath) return new Response("No encontrado", { status: 404 });

  const file = await readStoredFile(item.filePath);
  const ext = path.extname(item.filePath);
  const name = `${request.number}-${item.documentType.code.toLowerCase()}${ext}`;
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": mimeFor(item.filePath),
      "Content-Disposition": `inline; filename="${name}"`,
    },
  });
}
