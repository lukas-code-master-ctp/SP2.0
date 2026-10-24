import type { ItemStatus, RequestStatus } from "@prisma/client";
import { CircleCheck, CircleMinus, Clock, Eye, LoaderCircle, RefreshCw, CircleX, CreditCard, FileText, Sparkles } from "lucide-react";
import { ITEM_STATUS_LABEL, REQUEST_STATUS_LABEL } from "@/lib/labels";
import { cx } from "@/lib/cx";

const TONE = {
  neutral: "bg-cloud/70 text-slate-600",
  progress: "bg-brand-50 text-brand-600",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  info: "bg-sky-50 text-sky-800",
} as const;

const ITEM = {
  PENDIENTE: { tone: "neutral", icon: Clock },
  OBTENIENDO: { tone: "progress", icon: LoaderCircle },
  OBTENIDO: { tone: "success", icon: CircleCheck },
  REQUIERE_ACCION: { tone: "info", icon: Eye },
  FALLIDO: { tone: "warning", icon: RefreshCw },
  NO_APLICA: { tone: "neutral", icon: CircleMinus },
} as const;

const REQUEST = {
  BORRADOR: { tone: "neutral", icon: FileText },
  PENDIENTE_PAGO: { tone: "warning", icon: CreditCard },
  PAGADA: { tone: "progress", icon: Clock },
  EN_PROCESO: { tone: "progress", icon: LoaderCircle },
  GENERANDO_INFORME: { tone: "progress", icon: Sparkles },
  COMPLETADA: { tone: "success", icon: CircleCheck },
  CANCELADA: { tone: "neutral", icon: CircleX },
} as const;

function Badge({ tone, Icon, label, spin }: { tone: keyof typeof TONE; Icon: typeof Clock; label: string; spin?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", TONE[tone])}>
      <Icon className={cx("h-3.5 w-3.5", spin && "animate-spin")} aria-hidden />
      {label}
    </span>
  );
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const s = ITEM[status];
  return <Badge tone={s.tone} Icon={s.icon} label={ITEM_STATUS_LABEL[status]} spin={status === "OBTENIENDO"} />;
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const s = REQUEST[status];
  return <Badge tone={s.tone} Icon={s.icon} label={REQUEST_STATUS_LABEL[status]} spin={status === "EN_PROCESO"} />;
}
