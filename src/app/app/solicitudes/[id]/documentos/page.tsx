import { redirect } from "next/navigation";
import { requireOnboardedUser } from "@/lib/auth";
import { getOwnedRequest } from "@/lib/requests";
import { Steps } from "@/components/Steps";
import { DocumentSelection } from "./DocumentSelection";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const request = await getOwnedRequest(id, user.id);
  if (request.status !== "BORRADOR" && request.status !== "PENDIENTE_PAGO") redirect(`/app/solicitudes/${id}`);

  return (
    <>
      <Steps current={1} />
      <h1 className="text-2xl font-bold">Documentos requeridos</h1>
      <p className="mt-2 text-slate-600">
        {request.procedure.name} · Rol {request.rol}, {request.comuna.name}, {request.comuna.region.name}
      </p>
      <DocumentSelection
        requestId={request.id}
        items={request.items.map((i) => ({
          id: i.id,
          name: i.documentType.name,
          description: i.documentType.description,
          issuer: i.documentType.issuer,
          price: i.price,
          selected: i.selected,
        }))}
        report={{ name: request.procedure.reportName, price: request.procedure.reportPrice, included: request.includeReport }}
      />
    </>
  );
}
