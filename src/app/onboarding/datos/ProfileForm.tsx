"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { UserType } from "@prisma/client";
import { saveProfile } from "@/app/actions/onboarding";
import { Field, FormError, SubmitButton } from "@/components/ui";

export function ProfileForm({ userType }: { userType: UserType }) {
  const [state, action] = useActionState(saveProfile, undefined);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      {userType === "PERSONA" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" name="nombre" required error={e?.nombre} />
          <Field label="Apellido" name="apellido" required error={e?.apellido} />
          <Field label="RUT" name="rut" placeholder="12.345.678-5" required error={e?.rut} />
          <Field label="Teléfono" name="telefono" placeholder="+56 9 1234 5678" required error={e?.telefono} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razón social" name="razonSocial" required error={e?.razonSocial} />
          <Field label="RUT empresa" name="rutEmpresa" placeholder="76.123.456-7" required error={e?.rutEmpresa} />
          <Field label="Giro" name="giro" required error={e?.giro} />
          <Field label="Dirección" name="direccion" required error={e?.direccion} />
          <Field label="Representante legal" name="representanteNombre" required error={e?.representanteNombre} />
          <Field label="RUT representante" name="representanteRut" required error={e?.representanteRut} />
          <Field label="Teléfono" name="telefono" placeholder="+56 2 2345 6789" required error={e?.telefono} />
        </div>
      )}
      <div className="flex items-center justify-between pt-2">
        <Link href="/onboarding" className="text-sm text-slate-600">← Cambiar tipo de cuenta</Link>
        <SubmitButton>Continuar</SubmitButton>
      </div>
    </form>
  );
}
