import { redirect } from "next/navigation";
import { chooseUserType } from "@/app/actions/onboarding";
import { requireUser } from "@/lib/auth";

export default async function ChooseTypePage() {
  const user = await requireUser();
  if (user.onboarded) redirect("/app");

  const options = [
    { value: "PERSONA", title: "Particular", text: "Compro, vendo o regularizo una propiedad a mi nombre." },
    { value: "EMPRESA", title: "Empresa", text: "Inmobiliarias, corredoras, estudios jurídicos, bancos y otras empresas." },
  ];
  return (
    <>
      <h1 className="text-2xl font-bold">¿Cómo usarás la plataforma?</h1>
      <p className="mt-2 text-slate-600">Con esto ajustamos los datos que te pediremos.</p>
      <form action={chooseUserType} className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            name="userType"
            value={o.value}
            className={`card text-left transition hover:border-brand-500 hover:shadow-md ${user.userType === o.value ? "border-brand-500" : ""}`}
          >
            <span className="block text-lg font-semibold">{o.title}</span>
            <span className="mt-1 block text-sm text-slate-600">{o.text}</span>
          </button>
        ))}
      </form>
    </>
  );
}
