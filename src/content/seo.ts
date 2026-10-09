import type { Metadata } from "next";
import type { FaqItem } from "./faq";
import { SERVICES, PRODUCTS_FULL } from "./legacy-pages";
import { SITE } from "./site";

const SOCIAL_IMAGE = {
  url: "/brand/social-cover.png",
  width: 1200,
  height: 630,
  alt: "EGD — Tecnologia que conecta projeto e operação",
};

type Title = string | { absolute: string };

/** Identificadores estáveis das entidades (schema.org `@id`): as páginas apontam para eles. */
export const ORG_ID = `${SITE.url}/#organization`;
export const WEBSITE_ID = `${SITE.url}/#website`;

const abs = (path: string) => (path === "/" ? `${SITE.url}/` : `${SITE.url}${path}`);

/**
 * Metadados completos de uma página pública: título, descrição, canonical e a base de
 * compartilhamento (Open Graph e Twitter). O `openGraph` da página SUBSTITUI o do layout
 * (não é mesclado), por isso a imagem é repetida aqui.
 */
export function pageMeta({ title, description, path }: { title: Title; description: string; path: string }): Metadata {
  const shown = typeof title === "string" ? `${title} · EGD` : title.absolute;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: shown,
      description,
      url: path,
      siteName: SITE.shortName,
      locale: "pt_BR",
      type: "website",
      images: [SOCIAL_IMAGE],
    },
    twitter: { card: "summary_large_image", title: shown, description, images: [SOCIAL_IMAGE.url] },
  };
}

/**
 * Dados estruturados da organização (schema.org), para a home. `Organization` é o tipo que o
 * Google lê para o painel da marca; `additionalType` marca que é um serviço profissional.
 * `sameAs` liga a empresa aos perfis de quem responde por ela (sem perfis próprios ainda).
 */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    additionalType: "https://schema.org/ProfessionalService",
    name: SITE.name,
    alternateName: SITE.shortName,
    legalName: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/brand/apple-touch-icon.png`,
    image: `${SITE.url}${SOCIAL_IMAGE.url}`,
    description: SITE.description,
    slogan: "Tecnologia que conecta projeto e operação",
    email: SITE.email,
    foundingDate: SITE.foundingYear,
    founder: {
      "@type": "Person",
      name: SITE.founder.name,
      jobTitle: SITE.founder.jobTitle,
      worksFor: { "@id": ORG_ID },
      sameAs: [SITE.founder.linkedin, SITE.founder.github],
    },
    sameAs: [SITE.founder.linkedin, SITE.founder.github],
    areaServed: { "@type": "Country", name: "Brasil" },
    address: { "@type": "PostalAddress", addressLocality: "São Paulo", addressRegion: "SP", addressCountry: "BR" },
    knowsAbout: [
      "Desenvolvimento de sistemas de gestão",
      "Automação de processos",
      "Dados e painéis (BI)",
      "Agentes de IA",
      "Governança de dados",
      "Gestão de projetos ágeis",
      "Aplicativos de vistoria e fiscalização de obras",
      "Gestão de contratos de engenharia",
    ],
    knowsLanguage: "pt-BR",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE.email,
      availableLanguage: "pt-BR",
      areaServed: "BR",
      hoursAvailable: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Serviços da EGD",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: s.title, url: abs(`/servicos#${s.id}`) },
      })),
    },
  };
}

/** O site como entidade (schema.org WebSite), para a home. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE.url,
    name: SITE.name,
    alternateName: SITE.shortName,
    description: SITE.description,
    inLanguage: "pt-BR",
    publisher: { "@id": ORG_ID },
  };
}

export type WebPageKind = "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";

/** A página em si, ligada ao site e à organização. */
export function webPageJsonLd({ kind = "WebPage", path, title, description }: { kind?: WebPageKind; path: string; title: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@type": kind,
    "@id": `${abs(path)}#webpage`,
    url: abs(path),
    name: title,
    description,
    inLanguage: "pt-BR",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORG_ID },
    primaryImageOfPage: { "@type": "ImageObject", url: `${SITE.url}${SOCIAL_IMAGE.url}`, width: SOCIAL_IMAGE.width, height: SOCIAL_IMAGE.height },
  };
}

/** Trilha de navegação (schema.org BreadcrumbList): Início → página. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const trail = [{ name: "Início", path: "/" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: abs(item.path) })),
  };
}

/** Perguntas e respostas da página (schema.org FAQPage), com o mesmo texto mostrado na tela. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/** As seis frentes de serviço (schema.org Service), para /servicos. */
export function servicesJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Serviços da EGD",
    itemListElement: SERVICES.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        "@id": abs(`/servicos#${s.id}`),
        url: abs(`/servicos#${s.id}`),
        name: s.title,
        description: s.lead,
        serviceType: s.title,
        provider: { "@id": ORG_ID },
        areaServed: { "@type": "Country", name: "Brasil" },
        availableLanguage: "pt-BR",
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: s.title,
          itemListElement: s.capabilities.map((c) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: c.t, description: c.d } })),
        },
      },
    })),
  };
}

/** Os quatro produtos prontos (schema.org SoftwareApplication), para /produtos. */
export function productsJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Produtos da EGD",
    itemListElement: PRODUCTS_FULL.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        "@id": abs(`/produtos#${p.id}`),
        url: abs(`/produtos#${p.id}`),
        name: p.title,
        description: p.lead,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        featureList: p.features,
        provider: { "@id": ORG_ID },
        offers: { "@type": "Offer", url: abs("/contato"), availability: "https://schema.org/InStock", priceCurrency: "BRL", description: `Implantação em ${p.deploy}. Investimento sob proposta.` },
      },
    })),
  };
}
