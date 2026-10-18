"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { Field, SubmitButton } from "@/components/ui";

export default function RegisterPage() {
  const [state, action] = useActionState(register, undefined);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="title">Crea tu cuenta</h1>
        <p className="mt-2 text-sm text-slate-600">Arma tu carpeta legal en minutos.</p>
      </div>
      <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required error={e?.email} />
      <Field label="Contraseña" name="password" type="password" autoComplete="new-password" required error={e?.password} hint="Mínimo 8 caracteres" />
      <Field label="Repite la contraseña" name="confirm" type="password" autoComplete="new-password" required error={e?.confirm} />
      <SubmitButton className="w-full">Crear cuenta</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        ¿Ya tienes cuenta? <Link href="/ingresar" className="font-semibold text-brand-500 hover:underline">Ingresa</Link>
      </p>
    </form>
  );
}
