import { prisma } from "@/lib/db";
import { Steps } from "@/components/Steps";
import { NewRequestForm } from "./NewRequestForm";

export default async function NewRequestPage() {
  const [procedures, regions] = await Promise.all([
    prisma.procedure.findMany({ orderBy: { name: "asc" } }),
    prisma.region.findMany({
      orderBy: { order: "asc" },
      include: { comunas: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
    }),
  ]);
  return (
    <>
      <Steps current={0} />
      <h1 className="text-2xl font-bold">Nuevo trámite</h1>
      <p className="mt-2 text-slate-600">Cuéntanos qué necesitas y dónde está la propiedad.</p>
      <NewRequestForm
        procedures={procedures.map((p) => ({ code: p.code, name: p.name, description: p.description }))}
        regions={regions.map((r) => ({ id: r.id, name: r.name, comunas: r.comunas }))}
      />
    </>
  );
}
