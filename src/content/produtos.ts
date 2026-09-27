export type ProdutoStatus = { tone: "ok" | "info"; label: string };

export type LinhaDemo = { cells: (string | { status: "ok" | "warn" | "err" | "info" | "none"; label: string })[] };

export type Produto = {
  slug: string;
  titulo: string;
  resumo: string;
  lead: string;
  status: ProdutoStatus;
  funcoes: string[];
  implantacao: string;
  areas: string;
  stack: string;
  demo: { titulo: string; codigo: string; colunas: string[]; linhas: LinhaDemo[]; nota?: string };
  caseHref?: string;
};

export const PRODUTOS: Produto[] = [
  {
    slug: "sigd",
    titulo: "SIGD: gestão documental e de processos",
    resumo: "Documentos, revisões, fluxos de aprovação e trilha de auditoria.",
    lead: "Documentos, revisões, fluxos de aprovação e trilha de auditoria de tudo que entra e sai de um contrato.",
    status: { tone: "ok", label: "Em produção em cinco consórcios" },
    funcoes: [
      "Controle de revisões e versões com histórico",
      "Fluxos de aprovação com prazos e alçadas",
      "Busca por metadados e conteúdo",
      "Trilha de auditoria de acesso e alteração",
      "Integração com SharePoint e e-mail",
    ],
    implantacao: "3 a 6 semanas",
    areas: "Engenharia, gerenciamento, jurídico",
    stack: "Power Apps, SharePoint, Power Automate, Power BI",
    caseHref: "/cases#urbhis",
    demo: {
      titulo: "Documentos do contrato, revisões em aberto",
      codigo: "SIGD",
      colunas: ["Documento", "Rev.", "Etapa", "Prazo"],
      linhas: [
        { cells: ["Memorial descritivo do lote 04", "R2", { status: "warn", label: "Em aprovação" }, "28/09"] },
        { cells: ["Planta de implantação", "R5", { status: "ok", label: "Aprovado" }, "—"] },
        { cells: ["Relatório de vistoria 0921", "R1", { status: "info", label: "Em análise" }, "30/09"] },
        { cells: ["Ata de reunião 14", "R0", { status: "none", label: "Rascunho" }, "—"] },
      ],
    },
  },
  {
    slug: "campo",
    titulo: "Sistema de campo: vistorias e fiscalização",
    resumo: "Checklists, fotos com localização e assinatura. Funciona sem sinal e sincroniza depois.",
    lead: "Aplicativo para inspeções em campo com checklists, fotos com localização, assinatura e relatório automático.",
    status: { tone: "ok", label: "Em produção" },
    funcoes: [
      "Checklists por tipo de obra ou ativo",
      "Fotos com localização e horário",
      "Uso sem sinal com sincronização automática",
      "Relatório em PDF gerado e enviado ao fim da vistoria",
      "Painel com mapa de não conformidades",
    ],
    implantacao: "4 a 6 semanas",
    areas: "Engenharia, fiscalização, manutenção",
    stack: "Power Apps, Supabase, React Native, Power BI",
    demo: {
      titulo: "Vistoria 4821, checklist estrutural",
      codigo: "CAMPO",
      colunas: ["Item", "Verificação", "Resultado"],
      linhas: [
        { cells: ["001", "Armadura conforme projeto", { status: "ok", label: "Conforme" }] },
        { cells: ["014", "Concreto dos pilares", { status: "warn", label: "Observação" }] },
        { cells: ["022", "EPI da equipe", { status: "err", label: "Não conforme" }] },
        { cells: ["031", "Sinalização de acesso", { status: "ok", label: "Conforme" }] },
      ],
      nota: "3 fotos anexadas, sincronizado às 16:42, assinado por J. Almeida",
    },
  },
  {
    slug: "contratos",
    titulo: "Gestão de contratos",
    resumo: "Vigência, aditivos, alertas de vencimento e indicadores por contrato.",
    lead: "Vigência, aditivos, alertas de vencimento e indicadores de cada contrato em um lugar só.",
    status: { tone: "info", label: "Pronto para implantar" },
    funcoes: [
      "Aprovação em níveis com alçadas",
      "Alertas de vencimento e reajuste em 90, 60 e 30 dias",
      "Repositório central com versões",
      "Painel de obrigações e prazos",
      "Integração com ERP e diretório corporativo",
    ],
    implantacao: "2 a 4 semanas",
    areas: "Jurídico, suprimentos, financeiro",
    stack: "SharePoint, Power Apps, Power Automate, Power BI",
    demo: {
      titulo: "Contratos com vencimento nos próximos 90 dias",
      codigo: "CONTRATOS",
      colunas: ["Contrato", "Fornecedor", "Vence em", "Alerta"],
      linhas: [
        { cells: ["CT-2024-018", "Terraplenagem Norte", "12 dias", { status: "err", label: "30 dias" }] },
        { cells: ["CT-2023-092", "Locação de equipamentos", "41 dias", { status: "warn", label: "60 dias" }] },
        { cells: ["CT-2025-007", "Topografia e cadastro", "77 dias", { status: "info", label: "90 dias" }] },
      ],
    },
  },
  {
    slug: "chamados",
    titulo: "Central de chamados",
    resumo: "Abertura, prazo e histórico de atendimentos, com base de conhecimento.",
    lead: "Abertura, prazo e histórico de atendimentos, com base de conhecimento e indicadores.",
    status: { tone: "info", label: "Pronto para implantar" },
    funcoes: [
      "Abertura por e-mail, web e Teams",
      "Prazo por categoria e prioridade",
      "Base de conhecimento com busca",
      "Painel de atendimentos em aberto e prazos",
      "Classificação automática por assistente de IA",
    ],
    implantacao: "2 a 3 semanas",
    areas: "TI, facilities, atendimento",
    stack: "SharePoint, Power Automate, n8n, Azure OpenAI",
    demo: {
      titulo: "Atendimentos em aberto hoje",
      codigo: "CHAMADOS",
      colunas: ["Nº", "Assunto", "Prioridade", "Prazo"],
      linhas: [
        { cells: ["9847", "VPN não conecta", "Alta", { status: "ok", label: "2 h restantes" }] },
        { cells: ["9846", "Acesso ao SharePoint", "Média", { status: "info", label: "Resolvido pelo assistente" }] },
        { cells: ["9844", "Erro no painel Power BI", "Alta", { status: "warn", label: "30 min" }] },
      ],
    },
  },
];
