/**
 * Conteúdo do documento da proposta (Fase 16): as seções do modelo do kit
 * comercial, validadas e com padrões. Puro: sem banco.
 */
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max, `Máximo ${max} caracteres`).default("");
const row = <T extends z.ZodRawShape>(shape: T) => z.array(z.object(shape)).max(12, "Máximo 12 linhas").default([]);

export const proposalDocumentSchema = z.object({
  subtitle: text(120),
  projectName: text(160),
  context: text(4000),
  objective: text(4000),
  approach: row({ stage: text(60), description: text(600) }),
  deliverables: row({ title: text(160), acceptance: text(400), due: text(60) }),
  assumptions: text(4000),
  scopeLimits: text(4000),
  governance: text(4000),
  technology: text(4000),
  investment: row({ item: text(160), amountCents: z.coerce.number().int().min(0, "Valor inválido").default(0), condition: text(200) }),
  paymentTerms: text(2000),
  continuity: text(2000),
  place: text(80),
});
export type ProposalDocument = z.infer<typeof proposalDocumentSchema>;
export type ProposalDocumentInput = z.input<typeof proposalDocumentSchema>;

export const DEFAULT_APPROACH = [
  { stage: "Entender", description: "Levantamento dos processos, fontes de dados e critérios de sucesso." },
  { stage: "Conectar", description: "Desenho da solução, integrações e validação técnica." },
  { stage: "Entregar", description: "Implementação, homologação, documentação e transição." },
];

export function emptyDocument(): ProposalDocument {
  return proposalDocumentSchema.parse({ subtitle: "Do desafio à próxima entrega", approach: DEFAULT_APPROACH, place: "São Paulo" });
}

/** Lê o jsonb gravado tolerando lixo: o que não valida volta ao padrão. */
export function parseStoredDocument(raw: unknown): ProposalDocument {
  const r = proposalDocumentSchema.safeParse(raw ?? {});
  if (!r.success) return emptyDocument();
  // documento recém-criado (jsonb vazio) ganha os padrões
  if (raw && typeof raw === "object" && Object.keys(raw as object).length === 0) return emptyDocument();
  return r.data;
}

/** Diferença entre a soma dos itens e o valor da proposta (0 quando não há itens ou bate). */
export function investmentMismatch(doc: Pick<ProposalDocument, "investment">, valueCents: number): number {
  const items = doc.investment.filter((i) => i.item || i.amountCents);
  if (items.length === 0) return 0;
  return items.reduce((s, i) => s + i.amountCents, 0) - valueCents;
}

/** As seções com conteúdo, na ordem e com numeração sequencial do modelo. */
type SectionBody =
  | { kind: "text"; title: string; body: string }
  | { kind: "table"; title: string; columns: string[]; rows: string[][]; note?: string };
export type Section = SectionBody & { number: string };

export function documentSections(doc: ProposalDocument, p: { valueFormatted: string; place: string; dateFormatted: string }): Section[] {
  const out: Section[] = [];
  const num = () => String(out.length + 1).padStart(2, "0");
  const push = (s: SectionBody) => out.push({ ...s, number: num() });
  if (doc.context) push({ kind: "text", title: "Contexto", body: doc.context });
  if (doc.objective) push({ kind: "text", title: "Objetivo", body: doc.objective });
  const approach = doc.approach.filter((a) => a.stage || a.description);
  if (approach.length) push({ kind: "table", title: "Abordagem", columns: ["Etapa", "O que será feito"], rows: approach.map((a) => [a.stage, a.description]) });
  const deliverables = doc.deliverables.filter((d) => d.title || d.acceptance || d.due);
  if (deliverables.length) push({ kind: "table", title: "Entregas previstas", columns: ["Entregável", "Critério de aceite", "Prazo"], rows: deliverables.map((d) => [d.title, d.acceptance, d.due]) });
  if (doc.assumptions) push({ kind: "text", title: "Premissas", body: doc.assumptions });
  if (doc.scopeLimits) push({ kind: "text", title: "Limites do escopo", body: doc.scopeLimits });
  if (doc.governance) push({ kind: "text", title: "Governança", body: doc.governance });
  if (doc.technology) push({ kind: "text", title: "Tecnologia e direitos", body: doc.technology });
  const investment = doc.investment.filter((i) => i.item || i.amountCents);
  push({
    kind: "table",
    title: "Investimento",
    columns: ["Item / marco", "Valor", "Condição"],
    rows: [...investment.map((i) => [i.item, formatBrl(i.amountCents), i.condition]), ["Total", p.valueFormatted, doc.paymentTerms ? "" : "—"]],
    note: doc.paymentTerms || undefined,
  });
  if (doc.continuity) push({ kind: "text", title: "Continuidade", body: doc.continuity });
  push({
    kind: "text",
    title: "Aprovação comercial",
    body: `O aceite desta proposta registra concordância comercial e autoriza a preparação do contrato. A execução somente começará após a formalização contratual e o atendimento das condições de início. Esta proposta, por si, não autoriza acesso a sistemas ou dados.\n\n${p.place}, ${p.dateFormatted}.`,
  });
  return out;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatBrl = (cents: number) => brl.format(cents / 100);
