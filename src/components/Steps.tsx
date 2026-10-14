const STEPS = ["Trámite y propiedad", "Documentos", "Pago", "En proceso"];

export function Steps({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex flex-wrap gap-2 text-sm">
      {STEPS.map((s, i) => (
        <li
          key={s}
          className={
            i === current
              ? "rounded-full bg-brand-600 px-3 py-1 font-medium text-white"
              : i < current
                ? "rounded-full bg-brand-100 px-3 py-1 text-brand-700"
                : "rounded-full bg-slate-100 px-3 py-1 text-slate-500"
          }
        >
          {i + 1}. {s}
        </li>
      ))}
    </ol>
  );
}
