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
import { installmentsTotal, type ContractDocument } from "@/modules/contracts/document";
import { updateContractDocumentForm } from "@/modules/contracts/form-actions";
import { MoneyCell } from "@/components/shell/money-input";

type Doc = ContractDocument;
type TextKey = { [K in keyof Doc]: Doc[K] extends string ? K : never }[keyof Doc];

const F = (key: TextKey, label: string, hint?: string, rows?: number) => ({ key, label, hint, rows });

const PARTIES = [
  F("projectDescription", "Descrição do projeto", "Cláusula 1: \"prestará os serviços de …\"."),
  F("clientEmail", "E-mail do cliente para comunicações"),
  F("egdManager", "Gestor pela EGD"),
  F("clientManager", "Gestor pelo cliente"),
];
const TERM = [
  F("startDate", "Data inicial da vigência", "Ex.: 01/11/2026"),
  F("endDate", "Data final da vigência"),
  F("acceptanceDays", "Dias úteis para aceite"),
  F("startConditions", "Condições de início", undefined, 2),
];
const PRICE = [
  F("billing", "Faturamento", "Documento fiscal e condições."),
  F("dueTerm", "Vencimento"),
  F("paymentMethod", "Meio de pagamento"),
  F("taxCondition", "Condição tributária"),
];
const CLAUSES = [
  F("confidentialityTerm", "Prazo de sigilo após o término"),
  F("cureTerm", "Prazo para regularização"),
  F("noticeTerm", "Aviso prévio para denúncia"),
  F("venue", "Foro", "Comarca com vínculo com as partes ou a obrigação."),
  F("place", "Local da assinatura"),
  F("witnesses", "Testemunhas", "Opcional: nome e identificação."),
];
const ANNEX_TEXT = [
  F("objective", "Objetivo", "Problema, usuários e resultado esperado.", 3),
  F("included", "Serviços incluídos", undefined, 3),
  F("excluded", "Limites e exclusões", undefined, 3),
  F("assumptions", "Premissas e acessos", "Insumos, licenças, responsáveis e dependências.", 3),
];
const ANNEX_TERMS = [
  F("charges", "Encargos e reajuste"),
  F("thirdParty", "Dependências e licenças de terceiros"),
  F("ipRegime", "Regime dos entregáveis", "Cessão ou licença, direitos, prazo, território, marco.", 2),
  F("preexisting", "Componentes preexistentes e de terceiros"),
  F("handover", "Entrega de código, repositório e documentação"),
  F("warranty", "Garantia contratual"),
  F("support", "Suporte"),
];

export function ContractForm({ contractId, initial, valueCents, readOnly, missing, pdfHref, proposalHref }: { contractId: string; initial: Doc; valueCents: number; readOnly: boolean; missing: string[]; pdfHref: string; proposalHref: string }) {
  const [doc, setDoc] = useState<Doc>(initial);
  const [state, formAction, pending] = useActionState<ActionResult<null> | null, FormData>(updateContractDocumentForm, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const set = <K extends keyof Doc>(k: K, v: Doc[K]) => setDoc((d) => ({ ...d, [k]: v }));
  const ro = readOnly;
  const total = useMemo(() => installmentsTotal(doc), [doc]);

  const text = (f: ReturnType<typeof F>) => (
    <div key={f.key} className={`grid gap-1.5 ${f.rows ? "md:col-span-2" : ""}`}>
      <Label htmlFor={`ct-${f.key}`}>{f.label}</Label>
      {f.rows ? (
        <Textarea id={`ct-${f.key}`} rows={f.rows} value={doc[f.key]} onChange={(e) => set(f.key, e.target.value)} readOnly={ro} />
      ) : (
        <Input id={`ct-${f.key}`} value={doc[f.key]} onChange={(e) => set(f.key, e.target.value)} readOnly={ro} />
      )}
      {f.hint && <span className="type-micro text-faint">{f.hint}</span>}
      <FieldError errors={fe?.[f.key]} />
    </div>
  );

  return (
    <form action={formAction} className="grid gap-6" data-testid="contrato-form">
      <input type="hidden" name="id" value={contractId} />
      <input type="hidden" name="document" value={JSON.stringify(doc)} />

      {missing.length > 0 && (
        <p role="note" className="rounded-r-md border-l-[3px] border-warning bg-warning-soft px-4 py-2 text-sm" data-testid="campos-faltando">
          Faltam para o contrato sair sem colchetes: {missing.join(", ")}. Dados da EGD ficam em <Link href="/admin/configuracoes" className="text-link underline">Configurações</Link>; os do cliente, na empresa.
        </p>
      )}

      <Block title="Partes e objeto"><div className="grid gap-4 md:grid-cols-2">{PARTIES.map(text)}</div></Block>
      <Block title="Vigência e início"><div className="grid gap-4 md:grid-cols-2">{TERM.map(text)}</div></Block>
      <Block title="Preço e faturamento" aside={`valor do contrato: ${formatBrlCents(valueCents)}`}><div className="grid gap-4 md:grid-cols-2">{PRICE.map(text)}</div></Block>
      <Block title="Prazos, foro e assinatura"><div className="grid gap-4 md:grid-cols-2">{CLAUSES.map(text)}</div></Block>

      <Block title="Anexo I · Escopo"><div className="grid gap-4 md:grid-cols-2">{ANNEX_TEXT.map(text)}</div></Block>
      <Block title="Anexo I · Entregáveis e marcos">
        <Rows
          rows={doc.deliverables}
          columns={[{ key: "title", label: "Entrega / evidência" }, { key: "acceptance", label: "Critério de aceite" }, { key: "due", label: "Prazo / responsável", width: "w-44" }]}
          onChange={(rows) => set("deliverables", rows)}
          readOnly={ro}
          empty={{ title: "", acceptance: "", due: "" }}
          addLabel="Adicionar entrega"
          prefix="del"
        />
      </Block>
      <Block title="Anexo I · Preço e pagamento" aside={total !== valueCents ? `soma das parcelas: ${formatBrlCents(total)}` : "parcelas batem com o valor"}>
        <div className="grid gap-3">
          <Rows
            rows={doc.installments.map((i) => ({ milestone: i.milestone, amountCents: String(i.amountCents || ""), condition: i.condition }))}
            columns={[{ key: "milestone", label: "Marco / parcela" }, { key: "amountCents", label: "Valor", width: "w-44", type: "money" }, { key: "condition", label: "Faturamento / vencimento", width: "w-56" }]}
            onChange={(rows) => set("installments", rows.map((r) => ({ milestone: r.milestone, amountCents: Number(r.amountCents || 0), condition: r.condition })))}
            readOnly={ro}
            empty={{ milestone: "", amountCents: "", condition: "" }}
            addLabel="Adicionar parcela"
            prefix="inst"
          />
          {total !== valueCents && total > 0 && (
            <p role="note" className="rounded-r-md border-l-[3px] border-warning bg-warning-soft px-4 py-2 text-sm">
              A soma das parcelas ({formatBrlCents(total)}) difere do valor da proposta ({formatBrlCents(valueCents)}). O PDF mostra os dois.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">{ANNEX_TERMS.map(text)}</div>
        </div>
      </Block>

      <Block title="Anexo II · Tratamento de dados">
        <div className="grid gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={doc.dataProcessing} onChange={(e) => set("dataProcessing", e.target.checked)} disabled={ro} className="size-4" />
            O projeto envolve tratamento de dados pessoais
          </label>
          {doc.dataProcessing ? (
            <Rows
              rows={doc.dataRows}
              columns={[{ key: "dimension", label: "Dimensão", width: "w-56" }, { key: "definition", label: "Definição acordada" }]}
              onChange={(rows) => set("dataRows", rows)}
              readOnly={ro}
              empty={{ dimension: "", definition: "" }}
              addLabel="Adicionar dimensão"
              prefix="data"
            />
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="ct-dataJustification">Justificativa</Label>
              <Textarea id="ct-dataJustification" rows={2} value={doc.dataJustification} onChange={(e) => set("dataJustification", e.target.value)} readOnly={ro} />
              <FieldError errors={fe?.dataJustification} />
            </div>
          )}
        </div>
      </Block>

      {state && !state.ok && !fe && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-success">Contrato salvo.</p>}
      <div className="flex flex-wrap items-center gap-2">
        {!ro && (
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar contrato"}
          </Button>
        )}
        <Button variant="outline" render={<a href={pdfHref} target="_blank" rel="noopener" />}>
          Ver prévia em PDF
        </Button>
        <Button variant="ghost" render={<Link href={proposalHref} />}>
          Voltar à proposta
        </Button>
        {ro && <span className="text-sm text-muted-foreground">Contrato emitido: somente leitura.</span>}
      </div>
    </form>
  );
}

type Col<T> = { key: keyof T & string; label: string; width?: string; type?: "number" | "money" };

function Rows<T extends Record<string, string>>({ rows, columns, onChange, readOnly, empty, addLabel, prefix }: { rows: T[]; columns: Col<T>[]; onChange: (rows: T[]) => void; readOnly: boolean; empty: T; addLabel: string; prefix: string }) {
  const update = (i: number, k: keyof T, v: string) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  return (
    <div className="grid gap-2">
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma linha.</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 md:flex-nowrap">
          {columns.map((c) => (
            <div key={c.key} className={`grid min-w-0 flex-1 gap-1 ${c.width ?? ""}`}>
              <Label htmlFor={`${prefix}-${c.key}-${i}`} className="type-micro text-muted-foreground">{c.label}</Label>
              {c.type === "money" ? (
                <MoneyCell id={`${prefix}-${c.key}-${i}`} cents={r[c.key]} onChange={(v) => update(i, c.key, v)} readOnly={readOnly} />
              ) : (
                <Input id={`${prefix}-${c.key}-${i}`} type={c.type ?? "text"} min={c.type === "number" ? 0 : undefined} value={r[c.key]} onChange={(e) => update(i, c.key, e.target.value)} readOnly={readOnly} />
              )}
            </div>
          ))}
          {!readOnly && (
            <Button type="button" variant="ghost" size="sm" aria-label={`Remover ${prefix} ${i + 1}`} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
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
