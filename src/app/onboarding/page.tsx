import { redirect } from "next/navigation";
import { ArrowRight, Building2, UserRound } from "lucide-react";
import { chooseUserType } from "@/app/actions/onboarding";
import { requireUser } from "@/lib/auth";
import { cx } from "@/lib/cx";

export default async function ChooseTypePage() {
  const user = await requireUser();
  if (user.onboarded) redirect("/app");

  const options = [
    { value: "PERSONA", title: "Particular", text: "Compro, vendo o regularizo una propiedad a mi nombre.", icon: UserRound },
    { value: "EMPRESA", title: "Empresa", text: "Inmobiliarias, corredoras, estudios jurídicos, bancos y otras empresas.", icon: Building2 },
  ];
  return (
    <>
      <p className="eyebrow">Paso 1 de 2</p>
      <h1 className="title mt-2">¿Cómo usarás la plataforma?</h1>
      <p className="mt-2 text-slate-600">Con esto ajustamos los datos que te pediremos.</p>
      <form action={chooseUserType} className="mt-8 grid gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <button
            key={o.value}
            name="userType"
            value={o.value}
            className={cx("card card-interactive group text-left", user.userType === o.value && "border-brand-500 ring-4 ring-brand-100")}
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-grad-light text-white shadow-lift">
              <o.icon className="h-6 w-6" aria-hidden />
            </span>
            <span className="mt-5 flex items-center justify-between text-lg font-semibold text-brand-900">
              {o.title}
              <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-brand-500" aria-hidden />
            </span>
            <span className="mt-1 block text-sm text-slate-600">{o.text}</span>
          </button>
        ))}
      </form>
    </>
  );
}
