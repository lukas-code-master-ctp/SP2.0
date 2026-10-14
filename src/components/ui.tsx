"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function SubmitButton({ children, className, ...props }: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={cx("btn-primary", className)}
      {...props}
    >
      {pending ? "Procesando…" : children}
    </button>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  ...props
}: { label: string; name: string; error?: string[]; hint?: ReactNode } & ComponentProps<"input">) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input name={name} className={cx("input", error && "border-red-500")} {...props} />
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error[0]}</span>}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}
