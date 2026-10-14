export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="mb-2 text-sm font-semibold text-brand-700">SP Documentos</p>
      {children}
    </main>
  );
}
