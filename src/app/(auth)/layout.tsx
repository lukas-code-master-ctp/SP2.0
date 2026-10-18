import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HeroMotion } from "@/components/motion/HeroMotion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-grad-hero p-10 text-white lg:flex">
        <Link href="/" aria-label="SmartProp, inicio">
          <Logo tone="light" className="h-9 w-auto" />
        </Link>
        <div className="mx-auto w-full max-w-sm">
          <HeroMotion />
        </div>
        <p className="max-w-sm text-2xl font-light leading-snug">
          Toda la documentación de tu propiedad, <span className="font-semibold">en un solo lugar.</span>
        </p>
      </aside>
      <main id="contenido" className="flex flex-col justify-center px-4 py-12 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" aria-label="SmartProp, inicio" className="mb-10 inline-block lg:hidden">
            <Logo className="h-9 w-auto" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
