import { Logo } from "@/components/brand/Logo";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenido" className="mx-auto max-w-2xl px-4 py-12">
      <Logo className="mb-10 h-8 w-auto" />
      {children}
    </main>
  );
}
