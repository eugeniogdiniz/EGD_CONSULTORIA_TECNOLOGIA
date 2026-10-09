/**
 * Cases fora do site público até o dono decidir o conteúdo (pedido de 2026-09-30).
 * O cadastro no admin e a API `/api/v1/cases` continuam funcionando.
 * Para voltar a mostrar, troque para `true`.
 */
export const SHOW_CASES = false;

/** Tira `/cases` de uma lista de links quando os cases estão ocultos. */
export const withoutHiddenCases = <T extends { href: string }>(links: T[]): T[] =>
  SHOW_CASES ? links : links.filter((l) => l.href !== "/cases");

export const SITE = {
  name: "EGD Consultoria em Tecnologia",
  shortName: "EGD",
  url: "https://egdsystem.com.br",
  description:
    "Sistemas de gestão, apps de campo e automação de relatórios para consórcios de engenharia, habitação e energia.",
  email: "contato@egdsystem.com.br",
  city: "São Paulo, Brasil",
  hours: "Segunda a sexta, 9h às 18h",
  hoursNote: "Horário de Brasília.",
  whereNote: "Trabalho remoto em todo o Brasil; presencial quando o projeto pede.",
  responseTime: "Respondemos em até 48 horas úteis.",
  foundingYear: "2018",
  /** Quem responde pela EGD: entra nos dados estruturados (schema.org) e no llms.txt. */
  founder: {
    name: "Eugênio G. Diniz",
    jobTitle: "Consultor em Tecnologia",
    linkedin: "https://www.linkedin.com/in/eugeniodiniz/",
    github: "https://github.com/eugeniogdiniz",
  },
  /** Setores em que a EGD atua, na ordem em que aparecem no site. */
  sectors: ["Consórcios de engenharia", "Habitação", "Energia", "Infraestrutura"],
} as const;

export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = withoutHiddenCases([
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/cases", label: "Cases" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
]);

export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: "Serviços",
    links: [
      { href: "/servicos#dev", label: "Desenvolvimento de sistemas" },
      { href: "/servicos#auto", label: "Automação de processos" },
      { href: "/servicos#dados", label: "Dados e painéis" },
      { href: "/servicos#ia", label: "Agentes de IA" },
      { href: "/servicos#gov", label: "Governança de dados" },
      { href: "/servicos#gestao", label: "Gestão de projetos" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/produtos", label: "Produtos" },
      ...(SHOW_CASES ? [{ href: "/cases", label: "Cases" }] : []),
      { href: "/sobre", label: "Sobre" },
      { href: "/contato", label: "Contato" },
      { href: "/entrar", label: "Entrar no portal" },
    ],
  },
];
