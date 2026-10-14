"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatRut, isValidRut } from "@/lib/rut";
import type { FormState } from "./auth";

const rut = z
  .string()
  .trim()
  .refine(isValidRut, "RUT inválido")
  .transform(formatRut);
const required = (msg: string) => z.string().trim().min(1, msg);
const phone = z.string().trim().regex(/^\+?[\d\s]{8,15}$/, "Teléfono inválido");

const personSchema = z.object({
  nombre: required("Ingresa tu nombre"),
  apellido: required("Ingresa tu apellido"),
  rut,
  telefono: phone,
});

const companySchema = z.object({
  razonSocial: required("Ingresa la razón social"),
  rutEmpresa: rut,
  giro: required("Ingresa el giro"),
  direccion: required("Ingresa la dirección"),
  representanteNombre: required("Ingresa el nombre del representante"),
  representanteRut: rut,
  telefono: phone,
});

/** Paso 2: particular o empresa. */
export async function chooseUserType(formData: FormData) {
  const user = await requireUser();
  const type = formData.get("userType");
  if (type !== "PERSONA" && type !== "EMPRESA") return;
  await prisma.user.update({ where: { id: user.id }, data: { userType: type } });
  redirect("/onboarding/datos");
}

/** Paso 3: datos iniciales según el tipo de usuario. */
export async function saveProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const data = Object.fromEntries(formData);

  if (user.userType === "PERSONA") {
    const parsed = personSchema.safeParse(data);
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    await prisma.personProfile.upsert({
      where: { userId: user.id },
      update: parsed.data,
      create: { ...parsed.data, userId: user.id },
    });
  } else if (user.userType === "EMPRESA") {
    const parsed = companySchema.safeParse(data);
    if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
    await prisma.companyProfile.upsert({
      where: { userId: user.id },
      update: parsed.data,
      create: { ...parsed.data, userId: user.id },
    });
  } else {
    redirect("/onboarding");
  }

  await prisma.user.update({ where: { id: user.id }, data: { onboarded: true } });
  redirect("/app");
}
