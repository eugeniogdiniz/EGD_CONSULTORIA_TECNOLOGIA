/**
 * Termo de entrega e aceite do kit (Fase 23) como blocos do PDF. A decisão
 * vem do aceite registrado pelo cliente no portal (Fase 22). Puro: sem banco.
 */
import type { DocBlock } from "@/modules/crm/doc-pdf";

export type AcceptanceRenderInput = {
  contractNumber: string | null;
  projectTitle: string;
  client: { name: string; representative: string | null };
  deliverable: { title: string; description: string | null; completedOn: string | null };
  approval: { name: string; email: string; at: string; notes: string | null; ipHash: string | null };
  /** ressalvas do dono, opcionais */
  reservations: string;
  egd: { representante: string; cargo: string; razaoSocial: string };
  place: string;
  issuedOn: string;
  version: number;
};

export function acceptanceBlocks(i: AcceptanceRenderInput): DocBlock[] {
  const decision = i.reservations.trim() ? "ACEITO COM RESSALVAS" : "ACEITO";
  const ip = i.approval.ipHash ? ` · origem ${i.approval.ipHash.slice(0, 12)}` : "";
  return [
    { kind: "kicker", text: "Termo de entrega e aceite" },
    { kind: "title", text: i.deliverable.title, subtitle: "Registro de validação dos entregáveis" },
    { kind: "meta", text: `Projeto ${i.projectTitle}${i.contractNumber ? ` · contrato ${i.contractNumber}` : ""} · versão ${i.version} · ${i.issuedOn}` },
    { kind: "h2", text: "Entrega validada, continuidade definida" },
    {
      kind: "table",
      columns: ["Referência", "Dados"],
      rows: [
        ["Contrato / projeto", `${i.contractNumber ?? "sem contrato no sistema"} · ${i.projectTitle}`],
        ["Cliente / responsável", `${i.client.name} · ${i.client.representative ?? i.approval.name}`],
        ["Entrega / data", `${i.deliverable.title} · concluída em ${i.deliverable.completedOn ?? "—"}`],
        ["Evidências", "Aprovação registrada no portal do cliente (EGD System), com usuário, data e origem."],
      ],
      widths: [0.28, 0.72],
    },
    { kind: "h3", text: "Verificação" },
    {
      kind: "table",
      columns: ["Critério contratado", "Resultado / evidência"],
      rows: [[i.deliverable.description || "Entrega conforme o Anexo I do contrato", `Aprovada por ${i.approval.name} (${i.approval.email}) em ${i.approval.at}${ip}.${i.approval.notes ? ` Observação do cliente: ${i.approval.notes}` : ""}`]],
      widths: [0.42, 0.58],
    },
    { kind: "h3", text: "Decisão" },
    { kind: "p", text: `${decision}. Fundamentação: aprovação expressa do cliente no portal, vinculada à entrega identificada. ${i.reservations.trim() ? `Ressalvas: ${i.reservations.trim()}` : "Pendências: sem pendências."}` },
    { kind: "h3", text: "Transição" },
    { kind: "p", text: "Código, documentação e acessos seguem o previsto no Anexo I do contrato. Início da garantia ou suporte, conforme contrato, a partir da data desta aprovação." },
    { kind: "p", muted: true, text: "Este termo abrange somente a entrega identificada e não altera preço, escopo ou direitos previstos no contrato. O aceite não afasta correções de defeitos ou obrigações de garantia aplicáveis." },
    { kind: "p", text: `${i.place}, ${i.issuedOn}.` },
    {
      kind: "signatures",
      parties: [
        { label: "Contratada", lines: [i.egd.representante || "[REPRESENTANTE_EGD]", i.egd.cargo, i.egd.razaoSocial || "EGD Consultoria em Tecnologia"] },
        { label: "Contratante", lines: [i.approval.name, `aprovação eletrônica em ${i.approval.at}`, i.client.name] },
      ],
    },
  ];
}
