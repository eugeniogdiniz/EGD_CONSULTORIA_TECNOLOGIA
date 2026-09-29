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
  responseTime: "Respondemos em até um dia útil.",
} as const;

export type NavLink = { href: string; label: string };

export const NAV_LINKS: NavLink[] = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/cases", label: "Cases" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

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
      { href: "/cases", label: "Cases" },
      { href: "/sobre", label: "Sobre" },
      { href: "/contato", label: "Contato" },
      { href: "/entrar", label: "Entrar no portal" },
    ],
  },
];
