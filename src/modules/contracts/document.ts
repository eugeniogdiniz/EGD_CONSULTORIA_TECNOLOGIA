/**
 * Conteúdo editável do contrato (Fase 23): os campos entre colchetes do modelo
 * do kit, validados e com padrões. Puro: sem banco. As cláusulas fixas ficam em
 * `template.ts`; aqui só o que o dono preenche ou o sistema puxa da proposta.
 */
import { z } from "zod";
import type { ProposalDocument } from "@/modules/crm/document";
import { formatBrl } from "@/modules/crm/document";

const text = (max: number, def = "") => z.string().trim().max(max, `Máximo ${max} caracteres`).default(def);
const rows = <T extends z.ZodRawShape>(shape: T) => z.array(z.object(shape)).max(12, "Máximo 12 linhas").default([]);

export const DATA_DIMENSIONS = [
  "Atividade e finalidade",
  "Papéis por operação",
  "Titulares e categorias",
  "Fundamento e instruções",
  "Acesso e segurança",
  "Terceiros e localização",
  "Retenção e término",
  "Incidentes",
  "Direitos e cooperação",
] as const;

export const contractDocumentSchema = z.object({
  // partes e objeto
  projectDescription: text(600),
  clientEmail: text(160),
  egdManager: text(120),
  clientManager: text(120),
  // vigência
  startDate: text(40),
  endDate: text(40),
  startConditions: text(600, "assinatura deste contrato, pagamento da primeira parcela e liberação dos acessos listados no Anexo I"),
  acceptanceDays: text(10, "5"),
  // preço
  billing: text(300, "nota fiscal de serviço emitida a cada parcela"),
  dueTerm: text(100, "10 dias corridos após a emissão do documento fiscal"),
  paymentMethod: text(100, "transferência bancária (Pix ou TED)"),
  taxCondition: text(300, "nota fiscal, conforme o enquadramento da CONTRATADA"),
  // prazos das cláusulas
  confidentialityTerm: text(60, "2 anos"),
  cureTerm: text(60, "15 dias"),
  noticeTerm: text(60, "30 dias"),
  venue: text(120),
  place: text(80, "São Paulo"),
  witnesses: text(300),
  // Anexo I
  objective: text(2000),
  included: text(2000),
  excluded: text(2000),
  assumptions: text(2000),
  deliverables: rows({ title: text(160), acceptance: text(400), due: text(60) }),
  installments: rows({ milestone: text(160), amountCents: z.coerce.number().int().min(0, "Valor inválido").default(0), condition: text(200) }),
  charges: text(400, "não aplicável"),
  thirdParty: text(400, "não aplicável"),
  ipRegime: text(600, "Cessão ao CONTRATANTE dos entregáveis desenvolvidos sob encomenda, após o pagamento integral; componentes preexistentes e de terceiros seguem as licenças do inventário."),
  preexisting: text(400, "bibliotecas de código aberto listadas no repositório, com suas licenças"),
  handover: text(400, "repositório Git, credenciais administrativas e documentação entregues no marco final"),
  warranty: text(300, "30 dias após o aceite, para correção de defeitos"),
  support: text(300, "não contratado; atendimento posterior por proposta própria"),
  // Anexo II
  dataProcessing: z.boolean().default(true),
  dataJustification: text(600),
  dataRows: rows({ dimension: text(80), definition: text(600) }),
});
export type ContractDocument = z.infer<typeof contractDocumentSchema>;
export type ContractDocumentInput = z.input<typeof contractDocumentSchema>;

export function emptyContractDocument(): ContractDocument {
  return contractDocumentSchema.parse({ dataRows: DATA_DIMENSIONS.map((dimension) => ({ dimension, definition: "" })) });
}

/** Lê o jsonb gravado tolerando lixo: o que não valida volta ao padrão. */
export function parseStoredContractDocument(raw: unknown): ContractDocument {
  if (!raw || typeof raw !== "object" || Object.keys(raw as object).length === 0) return emptyContractDocument();
  const r = contractDocumentSchema.safeParse(raw);
  return r.success ? r.data : emptyContractDocument();
}

export type ProposalSource = {
  title: string;
  valueCents: number;
  document: ProposalDocument;
  contact: { name: string | null; email: string | null } | null;
  /** parcelas já lançadas no projeto (Fase 18); vazio usa o investimento da proposta */
  invoices: { description: string; amountCents: number; dueAt: string }[];
  legal: { foro: string; representante: string };
};

/**
 * Pré-preenche o contrato com o que a proposta aceita já diz: objeto, Anexo I
 * (objetivo, limites, premissas, entregas e parcelas) e termos comerciais.
 * O dono revisa tudo antes de emitir.
 */
export function contractFromProposal(src: ProposalSource): ContractDocument {
  const d = src.document;
  const base = emptyContractDocument();
  const investment = d.investment.filter((i) => i.item || i.amountCents);
  const installments: ContractDocument["installments"] = src.invoices.length
    ? src.invoices.map((i) => ({ milestone: i.description, amountCents: i.amountCents, condition: `vencimento ${formatIsoDay(i.dueAt)}` }))
    : investment.length
      ? investment.map((i) => ({ milestone: i.item, amountCents: i.amountCents, condition: i.condition }))
      : [{ milestone: "Parcela única", amountCents: src.valueCents, condition: d.paymentTerms || "na assinatura" }];
  const approach = d.approach.filter((a) => a.stage || a.description).map((a) => (a.stage ? `${a.stage}: ${a.description}` : a.description));
  return {
    ...base,
    projectDescription: d.projectName || src.title,
    clientEmail: src.contact?.email ?? "",
    clientManager: src.contact?.name ?? "",
    egdManager: src.legal.representante,
    venue: src.legal.foro,
    place: d.place || base.place,
    objective: d.objective,
    included: approach.join("\n") || (d.deliverables.filter((x) => x.title).map((x) => x.title).join("; ")),
    excluded: d.scopeLimits,
    assumptions: d.assumptions,
    deliverables: d.deliverables.filter((x) => x.title).slice(0, 12),
    installments: installments.slice(0, 12),
    billing: d.paymentTerms || base.billing,
    ipRegime: d.technology || base.ipRegime,
    warranty: d.continuity || base.warranty,
  };
}

/** Soma das parcelas em centavos. */
export const installmentsTotal = (doc: Pick<ContractDocument, "installments">) => doc.installments.reduce((s, i) => s + i.amountCents, 0);

export { formatBrl };

/** AAAA-MM-DD → DD/MM/AAAA sem depender do fuso. */
export function formatIsoDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
