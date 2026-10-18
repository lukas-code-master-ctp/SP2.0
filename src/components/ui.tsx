"use client";

import { AnimatePresence, motion } from "motion/react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

export { cx } from "@/lib/cx";

export function SubmitButton({ children, className, ...props }: ComponentProps<"button">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      aria-busy={pending}
      className={cx("btn-primary", className)}
      {...props}
    >
      {pending ? (
        <>
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Procesando…
        </>
      ) : (
        children
      )}
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
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <label className="block">
      <span className="label">
        {label}
        {props.required && <span className="ml-0.5 text-brand-500" aria-hidden>*</span>}
      </span>
      <input
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx("input", error && "!border-red-500 focus:!ring-red-100")}
        {...props}
      />
      {hint && !error && <span id={`${name}-hint`} className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
      {error && (
        <motion.span
          id={`${name}-error`}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600"
        >
          <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
          {error[0]}
        </motion.span>
      )}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}
