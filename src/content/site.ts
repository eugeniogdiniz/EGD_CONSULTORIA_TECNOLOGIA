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
    /** Página do autor no site (schema.org Person com `@id` estável; os artigos apontam para ela). */
    path: "/sobre/eugenio-diniz",
    bio: "Fundador e consultor responsável pela EGD Consultoria em Tecnologia, em São Paulo. Desde 2018 desenvolve sistemas de gestão, aplicativos de campo e automações de relatórios para consórcios de engenharia, habitação e energia, e hoje também entrega dados, painéis e agentes de IA.",
    linkedin: "https://www.linkedin.com/in/eugeniodiniz/",
    github: "https://github.com/eugeniogdiniz",
  },
  /**
   * Perfis públicos da EMPRESA (não do fundador): entram no `sameAs` da Organization, no llms.txt
   * e no rodapé. Preencher conforme forem criados: perfil no Google Business, página da empresa
   * no LinkedIn, Instagram. Só URLs https.
   */
  profiles: [] as string[],
  /** Setores em que a EGD atua, na ordem em que aparecem no site. */
  sectors: ["Consórcios de engenharia", "Habitação", "Energia", "Infraestrutura"],
} as const;

export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = withoutHiddenCases([
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/consorcios", label: "Consórcios" },
  { href: "/cases", label: "Cases" },
  { href: "/artigos", label: "Artigos" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
]);

/** Colunas de links do rodapé; o componente `Footer` renderiza daqui. */
export const FOOTER_COLUMNS: { title: string; links: NavLink[] }[] = [
  {
    title: "Serviços",
    links: [
      { href: "/servicos/dev", label: "Desenvolvimento" },
      { href: "/servicos/auto", label: "Automação" },
      { href: "/servicos/data", label: "Data & BI" },
      { href: "/servicos/ia", label: "Agentes de IA" },
      { href: "/servicos/gov", label: "Governança" },
      { href: "/servicos/agile", label: "Projetos Ágeis" },
      { href: "/servicos/consultoria", label: "Consultoria" },
      { href: "/servicos/bpo", label: "BPO de Suporte" },
    ],
  },
  {
    title: "Para quem",
    links: [
      { href: "/consorcios", label: "Consórcios de engenharia" },
      { href: "/para/construtoras", label: "Construtoras" },
      { href: "/para/incorporadoras", label: "Incorporadoras" },
      { href: "/para/empresas-de-engenharia", label: "Empresas de engenharia" },
      { href: "/para", label: "Todos os públicos" },
    ],
  },
  {
    title: "Empresa",
    links: [
      { href: "/sobre", label: "Sobre" },
      { href: "/produtos", label: "Produtos" },
      { href: "/artigos", label: "Artigos" },
      ...(SHOW_CASES ? [{ href: "/cases", label: "Cases" }] : []),
      { href: "/contato", label: "Contato" },
      { href: "/entrar", label: "Portal do cliente" },
    ],
  },
];
