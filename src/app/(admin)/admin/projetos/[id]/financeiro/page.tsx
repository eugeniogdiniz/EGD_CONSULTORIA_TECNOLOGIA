import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import {
  getProject,
  getProjectFinancials,
  listExpenses,
  listProjectProposals,
  listTimeCostsByDeliverable,
} from "@/modules/projects/queries";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { ExpenseFormDialog } from "@/modules/projects/components/expense-form";
import { formatBrlCents, formatIsoDate } from "@/lib/format";

export const metadata = { title: "Financeiro" };

const EXPENSE_KIND_LABEL: Record<string, string> = {
  travel: "Viagem",
  service: "Serviço",
  equipment: "Equipamento",
  other: "Outros",
};

const PROPOSAL_STATUS: Record<string, { label: string; klass: string }> = {
  draft: { label: "rascunho", klass: "bg-subtle text-muted-foreground" },
  sent: { label: "enviada", klass: "bg-link-soft text-link" },
  accepted: { label: "aceita", klass: "bg-success-soft text-success" },
  rejected: { label: "rejeitada", klass: "bg-danger-soft text-danger" },
  expired: { label: "expirada", klass: "bg-warning-soft text-warning" },
};

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export default async function FinanceiroPage({ params }: PageProps<"/admin/projetos/[id]/financeiro">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const [financials, expenses, proposals, timeCosts] = await Promise.all([
    getProjectFinancials(ctx, id),
    listExpenses(ctx, id),
    listProjectProposals(ctx, id),
    listTimeCostsByDeliverable(ctx, id),
  ]);
  if (!financials) notFound();

  const totalMinutes = timeCosts.reduce((s, r) => s + r.totalMinutes, 0);
  const totalLaborCents = timeCosts.reduce((s, r) => s + r.laborCents, 0);
  const totalWithoutRate = timeCosts.reduce((s, r) => s + r.entriesWithoutRate, 0);
  const totalExpenseCents = expenses.reduce((s, r) => s + r.amountCents, 0);

  const budgetVsCostPct = financials.budgetCents && financials.budgetCents > 0
    ? Math.min(100, Math.round((financials.costCents / financials.budgetCents) * 100))
    : null;

  return (
    <>
      <PageHeader
        title={`Financeiro — ${project.project.title}`}
        meta="Orçamento vs. custo real (horas × rate + despesas) vs. receita aceita."
        actions={
          <ExpenseFormDialog
            projectId={id}
            trigger={<Button variant="secondary" size="sm" type="button">+ Nova despesa</Button>}
          />
        }
      />

      {financials.entriesWithoutRate > 0 && (
        <div className="rounded-md border border-warning bg-warning-soft px-4 py-3 text-sm text-warning">
          <strong>{financials.entriesWithoutRate} entrada{financials.entriesWithoutRate === 1 ? "" : "s"} sem rate.</strong>{" "}
          Elas contam <span className="type-data">R$ 0,00</span> pro custo. Ajuste seu rate em{" "}
          <Link href="/admin/conta" className="underline">/admin/conta → Rate por hora</Link>.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuotaCard label="Orçamento" value={formatBrlCents(financials.budgetCents)} hint="Snapshot da oportunidade" />
        <QuotaCard
          label="Custo"
          value={formatBrlCents(financials.costCents)}
          hint={`Labor ${formatBrlCents(financials.laborCents)} · despesas ${formatBrlCents(financials.expenseCents)}`}
          bar={budgetVsCostPct}
        />
        <QuotaCard
          label="Receita aceita"
          value={formatBrlCents(financials.revenueAcceptedCents)}
          hint={`${proposals.filter((p) => p.status === "accepted").length} aceita · ${proposals.filter((p) => p.status === "sent").length} enviada`}
        />
        <QuotaCard
          label="Margem"
          value={formatBrlCents(financials.marginCents)}
          hint={`${financials.marginPct}% sobre receita aceita`}
          tone={financials.marginCents >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Block
            title="Horas por entrega"
            aside={<span className="text-xs text-faint">{formatMinutes(totalMinutes)} · labor {formatBrlCents(totalLaborCents)}</span>}
            padded={false}
          >
            {timeCosts.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma entrada fechada ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-subtle text-muted-foreground">
                  <tr className="text-left">
                    <th className="h-10 px-4 font-medium">Entrega</th>
                    <th className="h-10 px-4 text-right font-medium">Minutos</th>
                    <th className="h-10 px-4 text-right font-medium">Custo</th>
                    <th className="h-10 px-4 text-right font-medium">Sem rate</th>
                  </tr>
                </thead>
                <tbody>
                  {timeCosts.map((r) => (
                    <tr key={r.deliverableId} className="border-t border-border">
                      <td className="px-4 py-2">
                        <Link href={`/admin/projetos/${id}/entregas/${r.deliverableId}`} className="hover:text-link">
                          {r.title}
                        </Link>
                      </td>
                      <td className="type-data px-4 py-2 text-right">{r.totalMinutes}</td>
                      <td className="type-data px-4 py-2 text-right">{formatBrlCents(r.laborCents)}</td>
                      <td className="type-data px-4 py-2 text-right">{r.entriesWithoutRate}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-subtle text-sm font-medium">
                    <td className="px-4 py-2">Total</td>
                    <td className="type-data px-4 py-2 text-right">{totalMinutes}</td>
                    <td className="type-data px-4 py-2 text-right">{formatBrlCents(totalLaborCents)}</td>
                    <td className="type-data px-4 py-2 text-right">{totalWithoutRate}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Block>

          <Block
            title="Despesas"
            aside={
              <ExpenseFormDialog
                projectId={id}
                trigger={<Button variant="secondary" size="sm" type="button">+ Nova despesa</Button>}
              />
            }
            padded={false}
          >
            {expenses.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma despesa ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-subtle text-muted-foreground">
                  <tr className="text-left">
                    <th className="h-10 px-4 font-medium">Descrição</th>
                    <th className="h-10 px-4 font-medium">Tipo</th>
                    <th className="h-10 px-4 font-medium">Data</th>
                    <th className="h-10 px-4 font-medium">Autor</th>
                    <th className="h-10 px-4 text-right font-medium">Valor</th>
                    <th className="h-10 px-4 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-2">
                        <div className="font-medium">{e.description}</div>
                        {e.notes && <div className="type-micro text-faint">{e.notes}</div>}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-sm border border-border bg-subtle px-1.5 py-0.5 text-[0.7rem] text-muted-foreground">
                          {EXPENSE_KIND_LABEL[e.kind]}
                        </span>
                      </td>
                      <td className="type-data px-4 py-2 text-muted-foreground">{formatIsoDate(e.dateAt)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{e.createdByName}</td>
                      <td className="type-data px-4 py-2 text-right">{formatBrlCents(e.amountCents)}</td>
                      <td className="px-4 py-2 text-right">
                        <ExpenseFormDialog
                          projectId={id}
                          expense={{
                            id: e.id,
                            description: e.description,
                            amountCents: e.amountCents,
                            kind: e.kind,
                            dateAt: e.dateAt,
                            notes: e.notes,
                          }}
                          trigger={<button type="button" className="text-xs text-link hover:underline">Editar</button>}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-subtle text-sm font-medium">
                    <td className="px-4 py-2" colSpan={4}>Total</td>
                    <td className="type-data px-4 py-2 text-right">{formatBrlCents(totalExpenseCents)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </Block>

          <Block title="Propostas" aside={<span className="text-xs text-faint">Da oportunidade origem</span>} padded={false}>
            {proposals.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhuma proposta vinculada.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-subtle text-muted-foreground">
                  <tr className="text-left">
                    <th className="h-10 px-4 font-medium">Número</th>
                    <th className="h-10 px-4 font-medium">Título</th>
                    <th className="h-10 px-4 font-medium">Status</th>
                    <th className="h-10 px-4 font-medium">Enviada</th>
                    <th className="h-10 px-4 font-medium">Decidida</th>
                    <th className="h-10 px-4 text-right font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => {
                    const s = PROPOSAL_STATUS[p.status] ?? { label: p.status, klass: "bg-subtle text-muted-foreground" };
                    return (
                      <tr key={p.id} className="border-t border-border">
                        <td className="type-data px-4 py-2">{p.number}</td>
                        <td className="px-4 py-2">{p.title}</td>
                        <td className="px-4 py-2">
                          <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[0.7rem]", s.klass)}>
                            {s.label}
                          </span>
                        </td>
                        <td className="type-data px-4 py-2 text-muted-foreground">{formatIsoDate(p.sentAt)}</td>
                        <td className="type-data px-4 py-2 text-muted-foreground">{formatIsoDate(p.decidedAt)}</td>
                        <td className="type-data px-4 py-2 text-right">{formatBrlCents(p.valueCents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Block>
        </div>

        <div className="flex flex-col gap-6">
          <Block title="Fórmulas">
            <div className="grid gap-2 text-xs leading-relaxed text-muted-foreground">
              <p><strong className="font-medium text-foreground">labor</strong> = <code className="type-data">Σ floor(minutes × rate ÷ 60)</code></p>
              <p><strong className="font-medium text-foreground">cost</strong> = <code className="type-data">labor + expenses</code></p>
              <p><strong className="font-medium text-foreground">revenueAccepted</strong> = <code className="type-data">Σ propostas aceitas</code></p>
              <p><strong className="font-medium text-foreground">margin</strong> = <code className="type-data">revenueAccepted − cost</code></p>
              <p><strong className="font-medium text-foreground">marginPct</strong> = <code className="type-data">round(margin ÷ revenueAccepted × 100)</code></p>
            </div>
          </Block>
        </div>
      </div>
    </>
  );
}

function QuotaCard({
  label,
  value,
  hint,
  bar,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  bar?: number | null;
  tone?: "positive" | "negative";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card p-4",
        tone === "positive" && "border-success",
        tone === "negative" && "border-danger",
      )}
    >
      <span className="type-micro text-muted-foreground">{label}</span>
      <span
        className={cn(
          "type-data text-2xl font-semibold",
          tone === "positive" && "text-success",
          tone === "negative" && "text-danger",
        )}
      >
        {value}
      </span>
      {hint && <span className="type-micro text-muted-foreground">{hint}</span>}
      {bar != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-sm bg-subtle">
          <div className="h-full bg-link" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}
