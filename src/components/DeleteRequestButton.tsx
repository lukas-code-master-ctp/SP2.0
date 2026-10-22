"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { deleteRequest } from "@/app/actions/requests";
import { cx } from "@/lib/cx";

function Button({ compact, label }: { compact?: boolean; label: string }) {
  const { pending } = useFormStatus();
  const Icon = pending ? LoaderCircle : Trash2;
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={cx(
        "btn-ghost text-slate-500 hover:!bg-red-50 hover:!text-red-600 disabled:opacity-50",
        compact && "!min-h-10 !w-10 !p-0",
      )}
    >
      <Icon className={cx("h-4 w-4", pending && "animate-spin")} aria-hidden />
      {!compact && (pending ? "Eliminando…" : "Eliminar solicitud")}
    </button>
  );
}

/** Elimina la solicitud tras pedir confirmación. Si se está obteniendo, el motor deja de procesarla. */
export function DeleteRequestButton({
  requestId,
  number,
  fetching,
  compact,
  className,
}: {
  requestId: string;
  number: number;
  fetching?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <form
      action={deleteRequest}
      className={className}
      onSubmit={(e) => {
        const message =
          `¿Eliminar la solicitud #${number}?` +
          (fetching ? " Dejaremos de obtener sus documentos." : "") +
          " Esta acción no se puede deshacer.";
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="requestId" value={requestId} />
      <Button compact={compact} label={`Eliminar solicitud #${number}`} />
    </form>
  );
}
