import Link from "next/link";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { LedgerFilters, LedgerState } from "@/modules/projects/queries";

/** Peças das telas de Contas a receber / a pagar: filtros por querystring, KPIs e selo de situação. */

export const LEDGER_STATE_OPTIONS: { value: LedgerState; label: string }[] = [
  { value: "open", label: "Em aberto" },
  { value: "overdue", label: "Vencidas" },
  { value: "paid", label: "Pagas" },
  { value: "cancelled", label: "Canceladas" },
  { value: "all", label: "Todas" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export function parseLedgerParams(sp: Record<string, string | string[] | undefined>, today: string): LedgerFilters & { general: boolean } {
  const state = str(sp.situacao);
  const from = str(sp.de);
  const to = str(sp.ate);
  return {
    state: LEDGER_STATE_OPTIONS.some((o) => o.value === state) ? (state as LedgerState) : "open",
    from: ISO.test(from) ? from : null,
    to: ISO.test(to) ? to : null,
    projectId: str(sp.projeto) || null,
    general: str(sp.gerais) === "1",
    today,
  };
}

export function LedgerKpi({ label, value, hint, tone, href }: { label: string; value: string; hint?: string; tone?: "danger" | "warning" | "success"; href?: string }) {
  const body = (
    <>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold tracking-tight tabular-nums", tone === "danger" && "text-danger", tone === "warning" && "text-warning", tone === "success" && "text-success")}>{value}</div>
      {hint && <div className="type-micro mt-1 text-faint">{hint}</div>}
    </>
  );
  const klass = "rounded-lg border border-border bg-card px-5 py-4 text-foreground";
  return href ? <Link href={href} className={cn(klass, "hover:border-strong")}>{body}</Link> : <div className={klass}>{body}</div>;
}

const field = "h-9 rounded-sm border border-input bg-card px-2 text-sm text-foreground";

export function LedgerFilterForm({
  action,
  filters,
  projects,
  generalOption,
}: {
  action: string;
  filters: LedgerFilters & { general?: boolean };
  projects: { id: string; title: string; companyName: string }[];
  /** mostra a opção "só custos gerais" (contas a pagar) */
  generalOption?: boolean;
}) {
  return (
    <form method="get" action={action} className="flex flex-wrap items-end gap-3" data-testid="ledger-filters">
      <label className="grid gap-1 text-xs text-muted-foreground">
        Situação
        <select name="situacao" defaultValue={filters.state} className={field}>
          {LEDGER_STATE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Vencimento de
        <input type="date" name="de" defaultValue={filters.from ?? ""} className={field} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        até
        <input type="date" name="ate" defaultValue={filters.to ?? ""} className={field} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground">
        Projeto
        <select name="projeto" defaultValue={filters.projectId ?? ""} className={cn(field, "max-w-[18rem]")}>
          <option value="">Todos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.title} · {p.companyName}</option>
          ))}
        </select>
      </label>
      {generalOption && (
        <label className="flex h-9 items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" name="gerais" value="1" defaultChecked={filters.general} className="size-4 rounded-sm border-input" />
          Só custos gerais
        </label>
      )}
      <Button type="submit" size="sm" variant="outline">Filtrar</Button>
      <Link href={action} className="text-sm text-link underline-offset-2 hover:underline">Limpar</Link>
    </form>
  );
}

export function StateBadge({ label, klass }: { label: string; klass: string }) {
  return <span className={cn("inline-flex h-[22px] items-center rounded-sm border px-2 text-xs font-medium whitespace-nowrap", klass)}>{label}</span>;
}

/** Linha de resumo no rodapé da tabela: soma do que está listado. */
export function LedgerFoot({ label, cents, span, trailing = 2 }: { label: string; cents: string; span: number; trailing?: number }) {
  return (
    <tfoot>
      <tr className="border-t border-border bg-subtle text-sm font-medium">
        <td className="px-4 py-2" colSpan={span}>{label}</td>
        <td className="type-data px-4 py-2 text-right">{cents}</td>
        <td colSpan={trailing} />
      </tr>
    </tfoot>
  );
}
