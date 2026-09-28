/** Dados reais da planilha de CAPEX (legacy/assets/cases.jsx). Conteúdo estático até a Fase 5. */
export type Cliente = {
  id: string;
  nome: string;
  setor: string;
  porte: "Micro" | "Pequeno" | "Médio" | "Grande";
  sistemas: number;
  automacoes: number;
  economia: number;
  capex: number;
  destaque?: boolean;
  entregas: string[];
  status?: string;
};

export const CLIENTES: Cliente[] = [
  { id: "bjmm", nome: "Consórcio BJMM", setor: "Habitação e engenharia", porte: "Médio", sistemas: 3, automacoes: 15, economia: 459482.8, capex: 26656, destaque: true, entregas: ["GED corporativo", "Sistema de vistoria em campo", "15 relatórios automatizados"] },
  { id: "habita-gerencial", nome: "Consórcio HABITA GERENCIAL", setor: "Habitação social", porte: "Médio", sistemas: 3, automacoes: 4, economia: 228004, capex: 95200, destaque: true, entregas: ["SIGD de gerenciamento", "Controle de recibos", "Sistema de campo"] },
  { id: "urbhis", nome: "Consórcio URBHIS", setor: "Urbanismo e habitação", porte: "Grande", sistemas: 4, automacoes: 12, economia: 199727.5, capex: 53074, destaque: true, entregas: ["Power Apps integrados", "Atendimento de plantão", "Power BI com mapa de conteúdo"] },
  { id: "macae", nome: "Macaé Petrobras", setor: "Petróleo e gás", porte: "Médio", sistemas: 1, automacoes: 12, economia: 48660, capex: 30940, entregas: ["Gerenciamento de Cabiúnas", "Compensação de inquilinos", "12 relatórios automatizados"] },
  { id: "vinci", nome: "Vinci Notificações", setor: "Notificações e compliance", porte: "Micro", sistemas: 2, automacoes: 2, economia: 28770, capex: 4284, entregas: ["App de notificações", "Relatório geral automatizado"] },
  { id: "bggk", nome: "Consórcio BGGK", setor: "Engenharia", porte: "Pequeno", sistemas: 2, automacoes: 3, economia: 16686.25, capex: 1904, entregas: ["SIGD dedicado", "Sistema de campo"] },
  { id: "bgpi", nome: "Consórcio BGPI", setor: "Engenharia", porte: "Médio", sistemas: 2, automacoes: 2, economia: 16686.25, capex: 1904, entregas: ["SIGD e sistema de campo"] },
  { id: "habita-social", nome: "Consórcio HABITA SOCIAL", setor: "Habitação social", porte: "Grande", sistemas: 3, automacoes: 3, economia: 16593.75, capex: 10472, entregas: ["Lançamento de KM", "Controle de frotas", "Planejamento"] },
  { id: "cohab", nome: "COHAB Santos", setor: "Habitação pública", porte: "Micro", sistemas: 2, automacoes: 3, economia: 11487.5, capex: 714, entregas: ["Sistema web dedicado", "App Android de arrolamento"] },
  { id: "cosan", nome: "Cosan", setor: "Energia e logística", porte: "Micro", sistemas: 3, automacoes: 2, economia: 0, capex: 0, entregas: ["SIGD", "Controle de arquivos", "Sistema de campo"], status: "Em desenvolvimento" },
  { id: "reurbsp", nome: "Consórcio REURBSP", setor: "Regularização fundiária", porte: "Grande", sistemas: 0, automacoes: 4, economia: 0, capex: 0, entregas: ["4 automações em homologação"], status: "Em desenvolvimento" },
  { id: "eletrobras", nome: "Eletrobras", setor: "Energia", porte: "Micro", sistemas: 1, automacoes: 0, economia: 0, capex: 0, entregas: ["Gestão de documentos (GED)"] },
  { id: "habita-reurbsp", nome: "Consórcio Habita REURBSP", setor: "Regularização e habitação", porte: "Grande", sistemas: 1, automacoes: 0, economia: 0, capex: 0, entregas: ["Sistema GED em produção"] },
];

export const TOTAIS = {
  clientes: CLIENTES.length,
  sistemas: CLIENTES.reduce((a, c) => a + c.sistemas, 0),
  automacoes: CLIENTES.reduce((a, c) => a + c.automacoes, 0),
  economia: CLIENTES.reduce((a, c) => a + c.economia, 0),
};

export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export const brlCurto = (n: number) =>
  n >= 1_000_000 ? `R$ ${(n / 1_000_000).toFixed(2).replace(".", ",")} mi` : `R$ ${Math.round(n / 1000)} mil`;
