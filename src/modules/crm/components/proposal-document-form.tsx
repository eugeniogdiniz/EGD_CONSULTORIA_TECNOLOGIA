"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Block } from "@/components/shell/page-header";
import { FieldError } from "@/components/shell/field-error";
import type { ActionResult } from "@/lib/action-result";
import { formatBrlCents } from "@/lib/format";
import { investmentMismatch, type ProposalDocument } from "@/modules/crm/document";
import { updateProposalDocumentForm } from "@/modules/crm/form-actions";

type Doc = ProposalDocument;

const TEXT_SECTIONS: { key: keyof Pick<Doc, "context" | "objective" | "assumptions" | "scopeLimits" | "governance" | "technology" | "paymentTerms" | "continuity">; label: string; hint: string; rows?: number }[] = [
  { key: "context", label: "Contexto", hint: "O cenário atual, a rotina da equipe e o problema observado. Só fatos confirmados pelo cliente." },
  { key: "objective", label: "Objetivo", hint: "O resultado esperado e como será avaliado, sem promessas ou métricas sem base." },
  { key: "assumptions", label: "Premissas", hint: "Disponibilidade dos responsáveis, acessos, qualidade dos dados, licenças e ambientes." },
  { key: "scopeLimits", label: "Limites do escopo", hint: "O que não está incluído: novas integrações, migração adicional, hospedagem, suporte contínuo." },
  { key: "governance", label: "Governança", hint: "Responsáveis, frequência das reuniões, registro de decisões, prazo e forma de validação." },
  { key: "technology", label: "Tecnologia e direitos", hint: "Ambiente e integrações, forma de entrega do código, propriedade intelectual, serviços de terceiros, dados." },
  { key: "paymentTerms", label: "Condições de pagamento", hint: "Forma de pagamento, licenças e despesas, prazo estimado. Aparece abaixo da tabela de investimento.", rows: 3 },
  { key: "continuity", label: "Continuidade", hint: "Garantia, suporte e custos posteriores.", rows: 3 },
];

/** Formulário do documento em seções, na ordem do modelo. Listas editáveis; o estado vai num campo oculto em JSON. */
export function ProposalDocumentForm({ proposalId, initial, valueCents, readOnly, pdfHref }: { proposalId: string; initial: Doc; valueCents: number; readOnly: boolean; pdfHref: string }) {
  const [doc, setDoc] = useState<Doc>(initial);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(updateProposalDocumentForm, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const mismatch = useMemo(() => investmentMismatch(doc, valueCents), [doc, valueCents]);
  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setDoc((d) => ({ ...d, [k]: v }));
  const ro = readOnly;

  return (
    <form action={formAction} className="grid gap-6">
      <input type="hidden" name="id" value={proposalId} />
      <input type="hidden" name="document" value={JSON.stringify(doc)} />

      <Block title="Capa">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="subtitle" label="Subtítulo" value={doc.subtitle} onChange={(v) => set("subtitle", v)} readOnly={ro} />
          <Field id="projectName" label="Nome do projeto" value={doc.projectName} onChange={(v) => set("projectName", v)} readOnly={ro} hint="Vazio: usa o título da proposta." />
          <Field id="place" label="Local da assinatura" value={doc.place} onChange={(v) => set("place", v)} readOnly={ro} />
        </div>
      </Block>

      {TEXT_SECTIONS.slice(0, 2).map((s) => (
        <TextSection key={s.key} s={s} value={doc[s.key]} onChange={(v) => set(s.key, v)} readOnly={ro} errors={fe?.[s.key]} />
      ))}

      <Block title="Abordagem" aside="etapas">
        <Rows
          rows={doc.approach}
          columns={[{ key: "stage", label: "Etapa", width: "w-40" }, { key: "description", label: "O que será feito" }]}
          onChange={(rows) => set("approach", rows)}
          readOnly={ro}
          empty={{ stage: "", description: "" }}
          addLabel="Adicionar etapa"
        />
      </Block>

      <Block title="Entregas previstas">
        <Rows
          rows={doc.deliverables}
          columns={[{ key: "title", label: "Entregável" }, { key: "acceptance", label: "Critério de aceite" }, { key: "due", label: "Prazo", width: "w-36" }]}
          onChange={(rows) => set("deliverables", rows)}
          readOnly={ro}
          empty={{ title: "", acceptance: "", due: "" }}
          addLabel="Adicionar entrega"
        />
      </Block>

      {TEXT_SECTIONS.slice(2, 6).map((s) => (
        <TextSection key={s.key} s={s} value={doc[s.key]} onChange={(v) => set(s.key, v)} readOnly={ro} errors={fe?.[s.key]} />
      ))}

      <Block title="Investimento" aside={`total da proposta: ${formatBrlCents(valueCents)}`}>
        <div className="grid gap-3">
          <Rows
            rows={doc.investment.map((i) => ({ item: i.item, amountCents: String(i.amountCents || ""), condition: i.condition }))}
            columns={[{ key: "item", label: "Item / marco" }, { key: "amountCents", label: "Valor (cents)", width: "w-40", type: "number" }, { key: "condition", label: "Condição", width: "w-48" }]}
            onChange={(rows) => set("investment", rows.map((r) => ({ item: r.item, amountCents: Number(r.amountCents || 0), condition: r.condition })))}
            readOnly={ro}
            empty={{ item: "", amountCents: "", condition: "" }}
            addLabel="Adicionar item"
          />
          {mismatch !== 0 && (
            <p role="note" className="rounded-r-md border-l-[3px] border-warning bg-warning-soft px-4 py-2 text-sm">
              A soma dos itens ({formatBrlCents(valueCents + mismatch)}) difere do valor da proposta ({formatBrlCents(valueCents)}). O PDF mostra o total da proposta; confira os itens.
            </p>
          )}
          <TextSection s={TEXT_SECTIONS[6]} value={doc.paymentTerms} onChange={(v) => set("paymentTerms", v)} readOnly={ro} bare />
        </div>
      </Block>

      <TextSection s={TEXT_SECTIONS[7]} value={doc.continuity} onChange={(v) => set("continuity", v)} readOnly={ro} />

      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-success">Documento salvo.</p>}
      <div className="flex flex-wrap items-center gap-2">
        {!ro && (
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar documento"}
          </Button>
        )}
        <Button variant="outline" render={<a href={pdfHref} target="_blank" rel="noopener" />}>
          Ver PDF
        </Button>
        <Button variant="ghost" render={<Link href={`/admin/crm/propostas/${proposalId}`} />}>
          Voltar à proposta
        </Button>
        {ro && <span className="text-sm text-muted-foreground">Proposta fora de rascunho: documento somente leitura.</span>}
      </div>
    </form>
  );
}

function Field({ id, label, value, onChange, readOnly, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; readOnly: boolean; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={`doc-${id}`}>{label}</Label>
      <Input id={`doc-${id}`} value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} />
      {hint && <span className="type-micro text-faint">{hint}</span>}
    </div>
  );
}

function TextSection({ s, value, onChange, readOnly, errors, bare = false }: { s: (typeof TEXT_SECTIONS)[number]; value: string; onChange: (v: string) => void; readOnly: boolean; errors?: string[]; bare?: boolean }) {
  const body = (
    <div className="grid gap-1.5">
      <Label htmlFor={`doc-${s.key}`} className={bare ? undefined : "sr-only"}>{s.label}</Label>
      <Textarea id={`doc-${s.key}`} rows={s.rows ?? 5} value={value} onChange={(e) => onChange(e.target.value)} readOnly={readOnly} aria-describedby={`doc-${s.key}-hint`} />
      <span id={`doc-${s.key}-hint`} className="type-micro text-faint">{s.hint}</span>
      <FieldError errors={errors} />
    </div>
  );
  return bare ? body : <Block title={s.label}>{body}</Block>;
}

type Col<T> = { key: keyof T & string; label: string; width?: string; type?: "number" };

function Rows<T extends Record<string, string>>({ rows, columns, onChange, readOnly, empty, addLabel }: { rows: T[]; columns: Col<T>[]; onChange: (rows: T[]) => void; readOnly: boolean; empty: T; addLabel: string }) {
  const update = (i: number, k: keyof T, v: string) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  return (
    <div className="grid gap-2">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma linha. {readOnly ? "" : "Sem linhas, a seção sai do PDF."}</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 md:flex-nowrap">
          {columns.map((c) => (
            <div key={c.key} className={`grid min-w-0 flex-1 gap-1 ${c.width ?? ""}`}>
              <Label htmlFor={`row-${c.key}-${i}`} className="type-micro text-muted-foreground">{c.label}</Label>
              <Input id={`row-${c.key}-${i}`} type={c.type ?? "text"} min={c.type === "number" ? 0 : undefined} value={r[c.key]} onChange={(e) => update(i, c.key, e.target.value)} readOnly={readOnly} />
            </div>
          ))}
          {!readOnly && (
            <Button type="button" variant="ghost" size="sm" aria-label={`Remover linha ${i + 1}`} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
              Remover
            </Button>
          )}
        </div>
      ))}
      {!readOnly && rows.length < 12 && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...rows, empty])}>
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
