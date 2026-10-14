"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { Field, FormError, SubmitButton } from "@/components/ui";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  const next = useSearchParams().get("next") ?? "";
  return (
    <form action={action} className="space-y-4">
      <h1 className="text-xl font-semibold">Ingresa a tu cuenta</h1>
      <FormError message={state?.error} />
      <input type="hidden" name="next" value={next} />
      <Field label="Correo electrónico" name="email" type="email" autoComplete="email" required />
      <Field label="Contraseña" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton className="w-full">Ingresar</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        ¿No tienes cuenta? <Link href="/registro" className="font-medium text-brand-600">Regístrate</Link>
      </p>
    </form>
  );
}
