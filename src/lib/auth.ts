import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function startSession(userId: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(userId), sessionCookieOptions);
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const jar = await cookies();
  const userId = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId }, include: { person: true, company: true } });
}

/** Usuario autenticado; redirige a /ingresar si no hay sesión. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  return user;
}

/** Usuario autenticado y con datos iniciales completos (pasos 2 y 3). */
export async function requireOnboardedUser() {
  const user = await requireUser();
  if (!user.onboarded) redirect("/onboarding");
  return user;
}

export function displayName(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  if (user.person) return `${user.person.nombre} ${user.person.apellido}`;
  if (user.company) return user.company.razonSocial;
  return user.email;
}
