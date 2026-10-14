import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user.userType) redirect("/onboarding");
  return (
    <>
      <h1 className="text-2xl font-bold">{user.userType === "EMPRESA" ? "Datos de la empresa" : "Tus datos"}</h1>
      <p className="mt-2 text-slate-600">Los usamos para emitir tus comprobantes y solicitar los documentos.</p>
      <div className="card mt-8">
        <ProfileForm userType={user.userType} />
      </div>
    </>
  );
}
