import Link from "next/link";
import { LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { displayName, requireOnboardedUser } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireOnboardedUser();
  const name = displayName(user);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-cloud bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/app" aria-label="SmartProp, mis solicitudes">
            <Logo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <span className="hidden items-center gap-2 text-slate-600 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-grad-dark text-xs font-semibold uppercase text-white" aria-hidden>
                {name.slice(0, 1)}
              </span>
              {name}
            </span>
            <form action={logout}>
              <button className="btn-ghost">
                <LogOut className="h-4 w-4" aria-hidden />
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
