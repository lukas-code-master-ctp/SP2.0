"use client";

import { useActionState, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";
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
        <SectionTitle n={1}>¿Qué trámite necesitas?</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          {procedures.map((p) => (
            <label
              key={p.code}
              className={cx(
                "card relative cursor-pointer transition duration-200 ease-out has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-200",
                procedure === p.code ? "!border-brand-500 bg-brand-50/60 ring-4 ring-brand-100" : "card-interactive",
              )}
            >
              <span
                className={cx(
                  "absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full border-2 transition",
                  procedure === p.code ? "border-brand-500 bg-brand-500 text-white" : "border-cloud bg-white",
                )}
                aria-hidden
              >
                {procedure === p.code && (
                  <motion.span className="block" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 25 }}>
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </motion.span>
                )}
              </span>
              <input
                type="radio"
                name="procedure"
                value={p.code}
                className="sr-only"
                checked={procedure === p.code}
                onChange={() => setProcedure(p.code)}
              />
              <span className="block pr-8 font-semibold text-brand-900">{p.name}</span>
              <span className="mt-1 block text-sm text-slate-600">{p.description}</span>
            </label>
          ))}
        </div>
        {e?.procedure && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{e.procedure[0]}</p>}
      </section>

      <section className="card grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3"><SectionTitle n={2}>¿Dónde está la propiedad?</SectionTitle></div>
        <label className="block">
          <span className="label">Región</span>
          <select name="regionId" className="input" value={regionId} onChange={(ev) => setRegionId(ev.target.value)} required>
            <option value="">Selecciona…</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          {e?.regionId && <span role="alert" className="mt-1.5 block text-xs font-medium text-red-600">{e.regionId[0]}</span>}
        </label>
        <label className="block">
          <span className="label">Comuna</span>
          <select name="comunaId" className="input" disabled={!regionId} required key={regionId}>
            <option value="">{regionId ? "Selecciona…" : "Primero elige región"}</option>
            {comunas.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {e?.comunaId && <span role="alert" className="mt-1.5 block text-xs font-medium text-red-600">{e.comunaId[0]}</span>}
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
          <SectionTitle n={3}>Inscripción en el Conservador <span className="font-normal text-slate-400">(opcional)</span></SectionTitle>
          <p className="mt-1 pl-10 text-sm text-slate-600">
            Si tienes la foja, número y año de la inscripción, los documentos del Conservador salen más rápido. Si no,
            los buscamos nosotros a partir del rol.
          </p>
        </div>
        <Field label="Foja" name="foja" placeholder="12345" error={e?.foja} />
        <Field label="Número" name="inscripcionNumero" placeholder="6789" error={e?.inscripcionNumero} />
        <Field label="Año" name="inscripcionAnio" placeholder="2015" inputMode="numeric" error={e?.inscripcionAnio} />
      </section>

      <section className="card grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <SectionTitle n={4}>Propietario <span className="font-normal text-slate-400">(opcional)</span></SectionTitle>
          <p className="mt-1 pl-10 text-sm text-slate-600">
            Algunos certificados, como el de matrimonio, se piden con el RUN del propietario. Si no lo tienes, los
            gestionamos nosotros.
          </p>
        </div>
        <Field label="RUN del propietario" name="propietarioRun" placeholder="12.345.678-9" error={e?.propietarioRun} />
      </section>

      <div className="flex justify-end">
        <SubmitButton>Ver documentos requeridos <ArrowRight className="h-4 w-4" aria-hidden /></SubmitButton>
      </div>
    </form>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 font-semibold text-brand-900">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-grad-light text-xs font-semibold text-white" aria-hidden>
        {n}
      </span>
      {children}
    </h2>
  );
}
