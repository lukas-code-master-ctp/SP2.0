import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <header className="mb-16 flex items-center justify-between">
        <span className="text-lg font-bold text-brand-700">SP Documentos</span>
        <nav className="flex gap-3">
          {user ? (
            <Link href="/app" className="btn-primary">Ir a mi cuenta</Link>
          ) : (
            <>
              <Link href="/ingresar" className="btn-secondary">Ingresar</Link>
              <Link href="/registro" className="btn-primary">Crear cuenta</Link>
            </>
          )}
        </nav>
      </header>

      <section className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Toda la documentación de tu propiedad, en un solo lugar.
        </h1>
        <p className="mt-6 text-lg text-slate-600">
          Indica el trámite, la comuna y el rol de la propiedad. Nosotros obtenemos los certificados del Conservador,
          SII, Tesorería y Municipalidad, y si lo necesitas, redactamos el borrador del informe de títulos o de
          saneamiento.
        </p>
        <div className="mt-8">
          <Link href={user ? "/app/tramites/nuevo" : "/registro"} className="btn-primary px-6 py-3 text-base">
            Iniciar un trámite
          </Link>
        </div>
      </section>

      <section className="mt-20 grid gap-6 sm:grid-cols-3">
        {[
          ["1. Cuéntanos la propiedad", "Trámite, región, comuna y rol de avalúo."],
          ["2. Elige los documentos", "Te mostramos los requeridos y su valor. Tú decides cuáles pedir."],
          ["3. Recibe todo listo", "Te avisamos por correo cuando estén los documentos y el informe."],
        ].map(([t, d]) => (
          <div key={t} className="card">
            <h3 className="font-semibold">{t}</h3>
            <p className="mt-2 text-sm text-slate-600">{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
