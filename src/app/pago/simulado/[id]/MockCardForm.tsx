"use client";

import { useActionState } from "react";
import { payWithMock } from "@/app/actions/payments";
import { Field, FormError, SubmitButton } from "@/components/ui";

export function MockCardForm({ paymentId }: { paymentId: string }) {
  const [state, action] = useActionState(payWithMock, undefined);
  const e = state?.fieldErrors;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="paymentId" value={paymentId} />
      <FormError message={state?.error} />
      <Field label="Nombre del titular" name="holder" autoComplete="cc-name" required error={e?.holder} />
      <Field
        label="Número de tarjeta"
        name="number"
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="4051 8856 0044 6623"
        required
        error={e?.number}
        hint="Prueba: cualquier número se aprueba, salvo los terminados en 0002."
      />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Vencimiento" name="expiry" placeholder="MM/AA" autoComplete="cc-exp" required error={e?.expiry} />
        <Field label="CVV" name="cvv" inputMode="numeric" autoComplete="cc-csc" required error={e?.cvv} />
      </div>
      <SubmitButton className="w-full">Pagar</SubmitButton>
    </form>
  );
}
