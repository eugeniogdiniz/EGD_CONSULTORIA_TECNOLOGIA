import { cn } from "cn";
import { formatSla, slaState } from "@/modules/requests/sla";

const TONE: Record<"ok" | "warn" | "err" | "none", string> = {
  ok: "border-success bg-success-soft text-success",
  warn: "border-warning bg-warning-soft text-warning",
  err: "border-danger bg-danger-soft text-danger",
  none: "border-border bg-subtle text-muted-foreground",
};

/** Selo do SLA de primeira resposta. `now` vem do servidor para o texto não variar entre render e hidratação. */
export function SlaBadge({
  request,
  now,
  compact = false,
}: {
  request: { firstResponseDueAt: Date | null; firstResponseAt: Date | null; createdAt: Date; status: string };
  now: Date;
  compact?: boolean;
}) {
  const s = slaState(request, now);
  if (s.kind === "none") return null;
  const { text, tone } = formatSla(s);
  return (
    <span
      data-testid="sla"
      data-sla={s.kind}
      className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", TONE[tone], compact && "h-5 text-[0.7rem]")}
    >
      {text}
    </span>
  );
}
