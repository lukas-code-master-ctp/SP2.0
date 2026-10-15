"use client";

import { useActionState, useState } from "react";
import { createRequest } from "@/app/actions/requests";
import { Field, FormError, SubmitButton, cx } from "@/components/ui";

type Props = {
  procedures: { code: string; name: string; description: string }[];
  regions: { id: number; name: string; comunas: { id: number; name: string }[] }[];
};

export function NewRequestForm({ procedures, regions }: Props) {
  const [state, action] = useActionState(createRequest, undefined);
  const [procedure, setProcedure] = useState("");
  const [regionId, setRegionId] = useState("");
  const comunas = regions.find((r) => String(r.id) === regionId)?.comunas ?? [];
  const e = state?.fieldErrors;

  return (
    <form action={action} className="mt-8 space-y-8">
      <FormError message={state?.error} />

      <section>
        <h2 className="mb-3 font-semibold">¿Qué trámite necesitas?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {procedures.map((p) => (
            <label
              key={p.code}
              className={cx("card cursor-pointer transition", procedure === p.code ? "!border-brand-500 bg-brand-50 ring-2 ring-brand-100" : "hover:border-slate-300")}
            >
              <input
                type="radio"
                name="procedure"
                value={p.code}
                className="sr-only"
                checked={procedure === p.code}
                onChange={() => setProcedure(p.code)}
              />
              <span className="block font-semibold">{p.name}</span>
              <span className="mt-1 block text-sm text-slate-600">{p.description}</span>
            </label>
          ))}
        </div>
        {e?.procedure && <p className="mt-2 text-xs text-red-600">{e.procedure[0]}</p>}
      </section>

      <section className="card grid gap-4 sm:grid-cols-3">
        <h2 className="font-semibold sm:col-span-3">¿Dónde está la propiedad?</h2>
        <label className="block">
          <span className="label">Región</span>
          <select name="regionId" className="input" value={regionId} onChange={(ev) => setRegionId(ev.target.value)} required>
            <option value="">Selecciona…</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {e?.regionId && <span className="mt-1 block text-xs text-red-600">{e.regionId[0]}</span>}
        </label>
        <label className="block">
          <span className="label">Comuna</span>
          <select name="comunaId" className="input" disabled={!regionId} required key={regionId}>
            <option value="">{regionId ? "Selecciona…" : "Primero elige región"}</option>
            {comunas.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {e?.comunaId && <span className="mt-1 block text-xs text-red-600">{e.comunaId[0]}</span>}
        </label>
        <Field
          label="Rol de avalúo"
          name="rol"
          placeholder="1234-56"
          required
          error={e?.rol}
          hint="Aparece en el certificado de avalúo o en la boleta de contribuciones."
        />
      </section>

      <section className="card grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <h2 className="font-semibold">Inscripción en el Conservador (opcional)</h2>
          <p className="mt-1 text-sm text-slate-600">
            Si tienes la foja, número y año de la inscripción, los documentos del Conservador salen más rápido. Si no,
            los buscamos nosotros a partir del rol.
          </p>
        </div>
        <Field label="Foja" name="foja" placeholder="12345" error={e?.foja} />
        <Field label="Número" name="inscripcionNumero" placeholder="6789" error={e?.inscripcionNumero} />
        <Field label="Año" name="inscripcionAnio" placeholder="2015" inputMode="numeric" error={e?.inscripcionAnio} />
      </section>

      <div className="flex justify-end">
        <SubmitButton>Ver documentos requeridos →</SubmitButton>
      </div>
    </form>
  );
}
