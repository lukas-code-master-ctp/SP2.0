import Link from "next/link";
import { ArrowRight, FileCheck, FolderOpen, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { HeroMotion } from "@/components/motion/HeroMotion";
import { Reveal } from "@/components/motion/Reveal";

const STEPS = [
  { icon: MapPin, title: "Cuéntanos la propiedad", text: "Trámite, región, comuna y rol de avalúo." },
  { icon: FileCheck, title: "Elige los documentos", text: "Te mostramos los requeridos y su valor. Tú decides cuáles pedir." },
  { icon: FolderOpen, title: "Recibe todo listo", text: "Te avisamos por correo cuando estén los documentos y el informe." },
];

const ISSUERS = ["Conservador de Bienes Raíces", "SII", "Tesorería", "Municipalidad"];

export default async function Home() {
  const user = await getCurrentUser();
  const startHref = user ? "/app/tramites/nuevo" : "/registro";
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" aria-label="SmartProp, inicio">
          <Logo className="h-8 w-auto sm:h-9" />
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <Link href="/app" className="btn-primary">Ir a mi cuenta</Link>
          ) : (
            <>
              <Link href="/ingresar" className="btn-ghost">Ingresar</Link>
              <Link href="/registro" className="btn-primary">Crear cuenta</Link>
            </>
          )}
        </nav>
      </header>

      <main id="contenido">
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <Reveal>
            <p className="eyebrow">Tu carpeta legal</p>
            <h1 className="mt-4 text-4xl font-light leading-[1.1] tracking-tight text-brand-900 sm:text-5xl lg:text-6xl">
              Toda la documentación de tu propiedad, <span className="text-gradient font-semibold">en un solo lugar.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Indica el trámite, la comuna y el rol de la propiedad. Nosotros obtenemos los certificados y, si lo
              necesitas, redactamos el borrador del informe de títulos o de saneamiento.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={startHref} className="btn-primary px-6 py-3 text-base">
                Iniciar un trámite <ArrowRight className="h-4 w-4" />
              </Link>
              {!user && <Link href="/ingresar" className="btn-secondary px-6 py-3 text-base">Ya tengo cuenta</Link>}
            </div>
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Instituciones">
              {ISSUERS.map((i) => (
                <li key={i} className="rounded-full border border-cloud bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  {i}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1}>
            <HeroMotion />
          </Reveal>
        </section>

        <section className="border-y border-cloud bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Reveal className="max-w-2xl">
              <p className="eyebrow">Cómo funciona</p>
              <h2 className="mt-3 text-3xl font-light tracking-tight text-brand-900 sm:text-4xl">
                Solicítala en minutos, <span className="font-semibold">nosotros hacemos el resto.</span>
              </h2>
            </Reveal>
            <div className="relative mt-12 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 0.08}>
                  <div className="card card-interactive h-full">
                    <div className="flex items-center justify-between">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-grad-light text-white shadow-lift">
                        <s.icon className="h-5 w-5" />
                      </span>
                      <span className="text-4xl font-extralight tabular-nums text-cloud">0{i + 1}</span>
                    </div>
                    <h3 className="mt-5 font-semibold text-brand-900">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Reveal className="relative overflow-hidden rounded-[2rem] bg-grad-hero px-6 py-14 text-center text-white shadow-lift sm:px-12">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
              aria-hidden
            />
            <div className="relative">
              <h2 className="text-3xl font-light tracking-tight sm:text-4xl">
                Tu próxima carpeta legal, <span className="font-semibold">lista sin filas ni trámites.</span>
              </h2>
              <Link href={startHref} className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-500 shadow-lift transition hover:-translate-y-px">
                Iniciar un trámite <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-cloud bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6">
          <Logo className="h-7 w-auto" />
          <span>www.smartprop.io</span>
        </div>
      </footer>
    </div>
  );
}
