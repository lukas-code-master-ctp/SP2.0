"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";

export type FormState = { error?: string; fieldErrors?: Record<string, string[] | undefined> } | undefined;

const credentials = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

function safeNext(next: FormDataEntryValue | null): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials
    .extend({ confirm: z.string() })
    .refine((d) => d.password === d.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const { email, password } = parsed.data;
  if (await prisma.user.findUnique({ where: { email } })) {
    return { fieldErrors: { email: ["Ya existe una cuenta con este correo"] } };
  }
  const user = await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
  await startSession(user.id);
  redirect("/onboarding");
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Correo o contraseña incorrectos" };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Correo o contraseña incorrectos" };
  }
  await startSession(user.id);
  redirect(safeNext(formData.get("next")) ?? (user.onboarded ? "/app" : "/onboarding"));
}

export async function logout() {
  await endSession();
  redirect("/");
}
