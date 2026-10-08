/**
 * Modelo do contrato de prestação de serviços do kit comercial como dados
 * (Fase 23): cláusulas fixas com placeholders `{{chave}}` e a montagem dos
 * blocos do PDF. Campo vazio aparece entre colchetes, como no modelo, para o
 * dono ver o que falta. Puro: sem banco.
 */
import type { DocBlock } from "@/modules/crm/doc-pdf";
import { formatBrl, installmentsTotal, type ContractDocument } from "./document";

export type ContractParties = {
  egd: { razaoSocial: string; cnpj: string; endereco: string; representante: string; cargo: string };
  client: { name: string; legalName: string; cnpj: string; address: string; representativeName: string; representativeRole: string };
};

export type ContractRenderInput = {
  number: string;
  version: number;
  issuedOn: string; // DD/MM/AAAA
  proposal: { number: string; version: number; title: string; valueCents: number; acceptedOn: string | null };
  parties: ContractParties;
  document: ContractDocument;
};

/** Troca `{{chave}}` pelo valor; vazio vira `[CHAVE]` para o campo faltante saltar aos olhos. */
export function fillTemplate(text: string, vars: Record<string, string | null | undefined>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v && v.trim() ? v.trim() : `[${key.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}]`;
  });
}

/** Chaves (rótulo legível) que faltam para o contrato sair sem colchetes. */
export function missingContractFields(i: ContractRenderInput): string[] {
  const out: string[] = [];
  const need = (v: string | null | undefined, label: string) => { if (!v || !v.trim()) out.push(label); };
  need(i.parties.egd.razaoSocial, "razão social da EGD");
  need(i.parties.egd.cnpj, "CNPJ da EGD");
  need(i.parties.egd.endereco, "endereço da EGD");
  need(i.parties.egd.representante, "representante da EGD");
  need(i.parties.client.legalName || i.parties.client.name, "razão social do cliente");
  need(i.parties.client.cnpj, "CNPJ do cliente");
  need(i.parties.client.address, "endereço do cliente");
  need(i.parties.client.representativeName, "representante do cliente");
  const d = i.document;
  need(d.projectDescription, "descrição do projeto");
  need(d.clientEmail, "e-mail do cliente");
  need(d.startDate, "data inicial da vigência");
  need(d.endDate, "data final da vigência");
  need(d.venue, "foro");
  need(d.objective, "objetivo (Anexo I)");
  if (d.deliverables.filter((x) => x.title).length === 0) out.push("entregáveis (Anexo I)");
  if (d.installments.filter((x) => x.milestone || x.amountCents).length === 0) out.push("parcelas (Anexo I)");
  if (!d.dataProcessing) need(d.dataJustification, "justificativa do Anexo II");
  return out;
}

const join = (...parts: (string | null | undefined)[]) => parts.map((p) => p?.trim()).filter(Boolean).join(" · ");

export function contractBlocks(i: ContractRenderInput): DocBlock[] {
  const d = i.document;
  const egd = i.parties.egd;
  const cli = i.parties.client;
  const clientLegal = cli.legalName || cli.name;
  const v: Record<string, string> = {
    numeroContrato: i.number,
    data: i.issuedOn,
    razaoSocialEgd: egd.razaoSocial,
    cnpjEgd: egd.cnpj,
    enderecoEgd: egd.endereco,
    representanteEgd: join(egd.representante, egd.cargo),
    razaoSocialCliente: clientLegal,
    cnpjCliente: cli.cnpj,
    enderecoCliente: cli.address,
    representanteCliente: join(cli.representativeName, cli.representativeRole),
    emailCliente: d.clientEmail,
    gestorEgd: d.egdManager || egd.representante,
    gestorCliente: d.clientManager,
    descricaoDoProjeto: d.projectDescription,
    proposta: `${i.proposal.number} v${i.proposal.version}${i.proposal.acceptedOn ? `, aceita em ${i.proposal.acceptedOn}` : ""}`,
    dataInicial: d.startDate,
    dataFinal: d.endDate,
    condicoesDeInicio: d.startConditions,
    prazoAceite: d.acceptanceDays,
    valor: formatBrl(i.proposal.valueCents),
    faturamento: d.billing,
    vencimento: d.dueTerm,
    meio: d.paymentMethod,
    condicaoTributaria: d.taxCondition,
    prazoSigilo: d.confidentialityTerm,
    prazoSaneamento: d.cureTerm,
    prazoAviso: d.noticeTerm,
    foro: d.venue,
    local: d.place,
  };
  const f = (s: string) => fillTemplate(s, v);
  const p = (s: string): DocBlock => ({ kind: "p", text: f(s) });
  const deliverables = d.deliverables.filter((x) => x.title);
  const installments = d.installments.filter((x) => x.milestone || x.amountCents);
  const total = installmentsTotal({ installments });

  const blocks: DocBlock[] = [
    { kind: "kicker", text: "Contrato de prestação de serviços" },
    { kind: "title", text: f("{{descricaoDoProjeto}}"), subtitle: "Consultoria, desenvolvimento e automação" },
    { kind: "meta", text: f("Contrato {{numeroContrato}} · versão " + i.version + " · {{data}} · proposta {{proposta}}") },
    { kind: "h2", text: "Partes e objeto" },
    {
      kind: "table",
      columns: ["Identificação", "Dados"],
      rows: [
        ["Contrato / data", f("{{numeroContrato}} · {{data}}")],
        ["Contratada", f("{{razaoSocialEgd}}, nome de divulgação EGD Consultoria em Tecnologia; CNPJ {{cnpjEgd}}; sede {{enderecoEgd}}; representante {{representanteEgd}}.")],
        ["Contratante", f("{{razaoSocialCliente}}; CNPJ {{cnpjCliente}}; sede {{enderecoCliente}}; representante {{representanteCliente}}.")],
        ["Comunicações", f("EGD: contato@egdsystem.com.br. Cliente: {{emailCliente}}. Gestores: {{gestorEgd}} e {{gestorCliente}}.")],
      ],
      widths: [0.26, 0.74],
    },
    { kind: "h3", text: "1. Objeto e documentos integrantes" },
    p("A CONTRATADA prestará os serviços de {{descricaoDoProjeto}}, conforme entregáveis, critérios de aceite e limites definidos no Anexo I. O Anexo II disciplina o tratamento de dados pessoais quando existente. Ambos integram este contrato e deverão ser preenchidos ou identificados como não aplicáveis, com justificativa."),
    p("A proposta {{proposta}} integra o ajuste apenas naquilo que estiver expressamente incorporado. Em caso de divergência, prevalecem os aditivos assinados, este contrato, o Anexo II para proteção de dados, o Anexo I para especificações técnicas e, por último, a proposta incorporada. Alterações de preço ou obrigações exigem concordância expressa das partes."),
    { kind: "h3", text: "2. Vigência e início" },
    p("A vigência será de {{dataInicial}} a {{dataFinal}}. O início da execução depende de {{condicoesDeInicio}}, incluindo a disponibilização dos acessos e insumos previstos. Prorrogação, renovação ou manutenção recorrente dependerão de instrumento escrito. O cronograma do Anexo I identifica marcos, dependências e responsáveis."),
    { kind: "h2", text: "Execução e condições comerciais" },
    { kind: "h3", text: "3. Responsabilidades e acompanhamento" },
    p("A CONTRATADA executará o escopo com diligência técnica, manterá o cliente informado sobre riscos e impedimentos, documentará as entregas e limitará o acesso às informações ao pessoal necessário. Subcontratações observarão o Anexo II e não afastarão sua responsabilidade pelas obrigações assumidas."),
    p("A CONTRATANTE fornecerá informações, licenças e acessos legitimamente disponíveis, indicará responsável pelas decisões, validará entregas e efetuará os pagamentos acordados. Credenciais deverão ser compartilhadas por canal seguro; dados de produção só serão utilizados quando necessários e autorizados."),
    { kind: "h3", text: "4. Entregas, aceite e mudanças" },
    p("Cada entrega será acompanhada de evidências vinculadas aos critérios do Anexo I. O cliente terá {{prazoAceite}} dias úteis para aceitar por escrito ou indicar divergências objetivas. A ausência de manifestação não constitui aceite automático. As partes registrarão o impacto de atrasos de validação no cronograma."),
    p("Desvios do escopo serão corrigidos no prazo acordado para sua gravidade. Evoluções e novos requisitos serão estimados separadamente e só executados após aprovação escrita dos impactos em prazo, preço e critérios de aceite. Atrasos por dependências serão comunicados com proposta de replanejamento."),
    { kind: "h3", text: "5. Preço, faturamento e despesas" },
    p("Preço total: {{valor}}, conforme parcelas do Anexo I. Faturamento: {{faturamento}}. Vencimento: {{vencimento}}. Meio de pagamento: {{meio}}. Tributos e retenções observarão o enquadramento aplicável, detalhado em {{condicaoTributaria}}."),
    p("Despesas de terceiros, deslocamentos e licenças somente serão reembolsados quando previamente autorizados, com limite e comprovação. Multa, juros, correção e reajuste, se negociados, deverão constar expressamente no Anexo I e respeitar a legislação aplicável. Valores contestados de boa-fé serão tratados pelos gestores; a parcela incontroversa permanece exigível."),
    { kind: "h2", text: "Tecnologia, sigilo e dados" },
    { kind: "h3", text: "6. Propriedade intelectual e entrega técnica" },
    p("As partes definem no Anexo I a titularidade ou licença dos entregáveis, inclusive código-fonte, documentação e artefatos. Sem estipulação válida em contrário, aplica-se o regime legal cabível, inclusive o art. 4º da Lei nº 9.609/1998 para programas de computador. Este contrato não presume retenção de direitos pela EGD."),
    p("Componentes preexistentes e de terceiros serão inventariados com suas licenças. Não se transfere a titularidade de direitos que a parte não detenha. A CONTRATADA assegurará as autorizações necessárias para o uso contratado e informará previamente restrições, custos recorrentes e obrigações de código aberto. Repositórios, credenciais administrativas e documentação serão entregues nos marcos definidos."),
    { kind: "h3", text: "7. Confidencialidade" },
    p("Cada parte usará informações técnicas, comerciais e operacionais recebidas apenas para executar o contrato, com acesso restrito e dever de sigilo equivalente para colaboradores autorizados. Excluem-se informações comprovadamente públicas, já conhecidas legitimamente, recebidas licitamente de terceiro ou desenvolvidas de forma independente."),
    p("Divulgação exigida por lei ou autoridade será limitada ao necessário e, quando permitido, comunicada previamente. O dever de sigilo vigorará durante o contrato e por {{prazoSigilo}} após seu término, sem afastar proteções legais que subsistam. Uso de nome, marca ou resultados como case dependerá de autorização escrita específica."),
    { kind: "h3", text: "8. Proteção de dados e segurança" },
    p("As partes observarão a LGPD e preencherão o Anexo II com finalidades, categorias de dados, papéis e instruções de tratamento. Os papéis decorrem das atividades efetivas, não apenas da denominação contratual. Dados pessoais não poderão ser reutilizados para finalidade própria ou treinamento de modelos de IA sem fundamento e autorização pertinentes."),
    p("Serão adotados controles de acesso, minimização, proteção de credenciais e medidas adequadas ao risco. A parte que identificar incidente comunicará a outra sem demora injustificada, observando o prazo operacional do Anexo II. A comunicação entre as partes não substitui obrigações legais perante titulares ou autoridades."),
    { kind: "h2", text: "Encerramento e formalização" },
    { kind: "h3", text: "9. Garantia, suporte e responsabilidade" },
    p("Correção de defeitos, garantia contratual e suporte seguirão os prazos, canais e limites do Anexo I, sem restringir direitos legais aplicáveis. Evoluções, novas integrações e atendimento recorrente exigem contratação expressa. Não há promessa de resultado econômico ou disponibilidade além de indicadores definidos e mensuráveis."),
    p("Cada parte responderá por danos que lhe sejam imputáveis nos termos da legislação e do nexo causal. Eventual limite de responsabilidade somente poderá ser incluído por negociação específica e revisão jurídica, sem afastar obrigações inderrogáveis. Eventos fora do controle razoável serão comunicados com medidas de mitigação e replanejamento."),
    { kind: "h3", text: "10. Rescisão e transição" },
    p("O descumprimento será comunicado por escrito, com prazo de {{prazoSaneamento}} para regularização quando cabível. Qualquer parte poderá denunciar o contrato mediante aviso de {{prazoAviso}} e acerto das consequências legais e comerciais aplicáveis, inclusive em contratos por prazo determinado. Este contrato não presume renúncia a indenizações previstas em lei."),
    p("No encerramento, serão apurados serviços realizados e valores devidos, com restituição de adiantamentos sem correspondente execução quando cabível. As partes combinarão a entrega de artefatos, revogação de acessos e devolução ou eliminação de dados, respeitada a retenção legal. Sigilo e obrigações que, por natureza, subsistam permanecem aplicáveis."),
    { kind: "h3", text: "11. Comunicações e solução de divergências" },
    p("Notificações serão enviadas aos contatos identificados, com registro de recebimento. As partes buscarão solução pelos gestores antes de medidas litigiosas, sem impedir providências urgentes. Aplica-se a legislação brasileira. Foro: {{foro}}, respeitadas as regras legais de competência."),
    p("A assinatura poderá ser física ou eletrônica, com identificação dos signatários e preservação da integridade do instrumento. Anexos e aditivos devem ser identificados pela mesma versão."),
    p("{{local}}, {{data}}."),
    {
      kind: "signatures",
      parties: [
        { label: "Contratada", lines: [egd.representante || "[REPRESENTANTE_EGD]", egd.cargo || "[CARGO]", clientLegalLine(egd.razaoSocial, "EGD")] },
        { label: "Contratante", lines: [cli.representativeName || "[REPRESENTANTE_CLIENTE]", cli.representativeRole || "[CARGO]", clientLegal] },
      ],
    },
    { kind: "p", muted: true, text: d.witnesses ? `Testemunhas: ${d.witnesses}.` : "Testemunhas, quando adotadas: 1. [NOME / IDENTIFICAÇÃO / ASSINATURA] · 2. [NOME / IDENTIFICAÇÃO / ASSINATURA]." },

    // ── Anexo I
    { kind: "pagebreak" },
    { kind: "kicker", text: "Anexo I" },
    { kind: "title", text: "Escopo e investimento" },
    {
      kind: "table",
      columns: ["Campo", "Definição acordada"],
      rows: [
        ["Projeto / versão", f("{{descricaoDoProjeto}} · proposta {{proposta}} · contrato {{numeroContrato}}")],
        ["Objetivo", d.objective || "[OBJETIVO]"],
        ["Incluído / excluído", `${d.included || "[SERVIÇOS INCLUÍDOS]"}\n\nExcluído: ${d.excluded || "[LIMITES E EXCLUSÕES]"}`],
        ["Premissas / acessos", d.assumptions || "[INSUMOS, LICENÇAS, RESPONSÁVEIS E DEPENDÊNCIAS]"],
      ],
      widths: [0.26, 0.74],
    },
    { kind: "h3", text: "Entregáveis e marcos" },
    {
      kind: "table",
      columns: ["Entrega / evidência", "Critério de aceite", "Prazo / responsável"],
      rows: deliverables.length ? deliverables.map((x) => [x.title, x.acceptance, x.due]) : [["[ENTREGA_01]", "[CRITÉRIO_MENSURÁVEL_01]", "[DATA / RESPONSÁVEL]"]],
    },
    { kind: "h3", text: "Preço e pagamento" },
    {
      kind: "table",
      columns: ["Marco / parcela", "Valor", "Faturamento / vencimento"],
      rows: [
        ...(installments.length ? installments.map((x) => [x.milestone, formatBrl(x.amountCents), x.condition]) : [["[MARCO_01]", "[VALOR_01]", "[CONDIÇÃO / DATA]"]]),
        ["Total", formatBrl(i.proposal.valueCents), total && total !== i.proposal.valueCents ? `soma das parcelas: ${formatBrl(total)}` : d.charges === "não aplicável" ? "sem encargos adicionais" : ""],
      ],
    },
    p(`Encargos e reajuste: ${d.charges || "[MULTA / JUROS / ÍNDICE / PERIODICIDADE]"}. Dependências e licenças de terceiros: ${d.thirdParty || "[ITENS / CUSTOS / RESPONSÁVEL]"}.`),
    { kind: "h3", text: "Direitos e continuidade" },
    p(`Regime dos entregáveis: ${d.ipRegime || "[CESSÃO OU LICENÇA]"} Inventário de componentes preexistentes e terceiros: ${d.preexisting || "[ANEXO / LICENÇAS]"}. Entrega de código, repositório e documentação: ${d.handover || "[FORMA / DATA]"}.`),
    p(f(`Garantia contratual: ${d.warranty || "[PRAZO / COBERTURA]"}. Suporte: ${d.support || "[CANAL / HORÁRIO / PRAZOS]"}. Gestores e aprovação deste anexo: {{gestorEgd}} e {{gestorCliente}}, em {{data}}.`)),

    // ── Anexo II
    { kind: "pagebreak" },
    { kind: "kicker", text: "Anexo II" },
    { kind: "title", text: "Tratamento de dados" },
  ];

  if (d.dataProcessing) {
    blocks.push(
      { kind: "p", muted: true, text: "Preenchido conforme o fluxo real do projeto. Reavaliar quando o escopo mudar." },
      { kind: "table", columns: ["Dimensão", "Definição acordada"], rows: d.dataRows.map((r) => [r.dimension, r.definition || "[A DEFINIR]"]), widths: [0.3, 0.7] },
      { kind: "h3", text: "Instruções e cooperação" },
      p("Quando atuar como operador, o prestador tratará dados conforme instruções lícitas e documentadas do controlador e comunicará instruções que entenda incompatíveis com a legislação. As partes cooperarão na apuração de incidentes e no atendimento de solicitações, preservando registros e restringindo a divulgação ao necessário."),
      p("Suboperadores e transferências internacionais, quando existentes, devem ser identificados e observar os requisitos legais pertinentes. A contratação de nuvem ou ferramenta de IA não autoriza, por si, o compartilhamento de dados do cliente."),
    );
  } else {
    blocks.push(
      p("Não há tratamento de dados pessoais previsto neste projeto. Justificativa: " + (d.dataJustification || "[JUSTIFICATIVA]") + " As partes reavaliarão este anexo se o escopo passar a envolver dados pessoais."),
    );
  }
  blocks.push(p("Aprovação deste anexo: {{gestorEgd}} e {{gestorCliente}}, em {{data}}."));
  return blocks;
}

function clientLegalLine(razao: string, fallback: string) {
  return razao || fallback;
}
