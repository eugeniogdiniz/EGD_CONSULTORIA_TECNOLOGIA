import { FAQ } from "./faq";
import { SERVICES, PRODUCTS_FULL, PRINCIPLES } from "./legacy-pages";
import { SHOW_CASES, SITE } from "./site";

/**
 * `/llms.txt` e `/llms-full.txt` (proposta llmstxt.org): um resumo em Markdown do que a EGD
 * faz, para assistentes de IA e buscadores por IA lerem sem precisar interpretar o HTML.
 * Gerado do mesmo conteúdo das páginas, então não desatualiza sozinho.
 */
const PAGES = [
  { path: "/", title: "Início", note: "quem é a EGD, serviços e produtos em resumo" },
  { path: "/servicos", title: "Serviços", note: "seis frentes, capacidades, stack e prazos" },
  { path: "/produtos", title: "Produtos", note: "quatro aceleradores prontos, funcionalidades e prazo de implantação" },
  ...(SHOW_CASES ? [{ path: "/cases", title: "Cases", note: "clientes, sistemas e automações em produção" }] : []),
  { path: "/sobre", title: "Sobre", note: "origem, princípios e setores atendidos" },
  { path: "/contato", title: "Contato", note: "formulário, e-mail, horário e portal do cliente" },
];

const link = (p: { path: string; title: string; note: string }) => `- [${p.title}](${SITE.url}${p.path}): ${p.note}`;

function header() {
  return [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description} Consultoria de tecnologia de São Paulo, Brasil, fundada em ${SITE.foundingYear} e conduzida por ${SITE.founder.name}. Atende remotamente em todo o Brasil; presencial quando o projeto pede.`,
    "",
    `- Site: ${SITE.url}`,
    `- E-mail: ${SITE.email}`,
    `- Atendimento: ${SITE.hours} (${SITE.hoursNote.replace(/\.$/, "")}). ${SITE.responseTime}`,
    `- Setores: ${SITE.sectors.join(", ")}.`,
    `- Idioma: português do Brasil.`,
  ].join("\n");
}

/** Versão curta: resumo e índice das páginas. */
export function llmsTxt() {
  return [
    header(),
    "",
    "## Serviços",
    "",
    ...SERVICES.map((s) => `- [${s.title}](${SITE.url}/servicos#${s.id}): ${s.lead} Primeira entrega: ${s.delivery}.`),
    "",
    "## Produtos prontos",
    "",
    ...PRODUCTS_FULL.map((p) => `- [${p.title}](${SITE.url}/produtos#${p.id}): ${p.lead} Implantação em ${p.deploy}.`),
    "",
    "## Páginas",
    "",
    ...PAGES.map(link),
    "",
    "## Mais detalhes",
    "",
    `- [Versão completa](${SITE.url}/llms-full.txt): serviços, produtos, princípios e perguntas frequentes em um só arquivo.`,
    "",
  ].join("\n");
}

/** Versão completa: tudo o que as páginas públicas dizem, em Markdown. */
export function llmsFullTxt() {
  const faqSection = (title: string, key: keyof typeof FAQ) => ["", `### ${title}`, "", ...FAQ[key].flatMap((f) => [`**${f.q}**`, "", f.a, ""])];
  return [
    header(),
    "",
    "## Serviços",
    "",
    ...SERVICES.flatMap((s) => [
      `### ${s.title}`,
      "",
      s.lead,
      "",
      ...s.capabilities.map((c) => `- ${c.t}: ${c.d}`),
      "",
      `Stack: ${[...s.stack.aws, ...s.stack.azure, ...s.stack.apache, ...s.stack.outros].join(", ")}.`,
      `Primeira entrega: ${s.delivery}. Equipe típica: ${s.squad}.`,
      `Página: ${SITE.url}/servicos#${s.id}`,
      "",
    ]),
    "## Produtos prontos",
    "",
    ...PRODUCTS_FULL.flatMap((p) => [
      `### ${p.title}`,
      "",
      p.lead,
      "",
      ...p.features.map((f) => `- ${f}`),
      "",
      `Implantação: ${p.deploy}. Áreas: ${p.scope}. Stack: ${p.stack.join(", ")}.`,
      `Página: ${SITE.url}/produtos#${p.id}`,
      "",
    ]),
    "## Princípios",
    "",
    ...PRINCIPLES.map((p) => `- ${p.t}: ${p.d}`),
    "",
    "## Perguntas frequentes",
    ...faqSection("Sobre a EGD", "home"),
    ...faqSection("Serviços", "servicos"),
    ...faqSection("Produtos", "produtos"),
    ...faqSection("Empresa", "sobre"),
    ...faqSection("Contato", "contato"),
    "## Páginas",
    "",
    ...PAGES.map(link),
    "",
  ].join("\n");
}
