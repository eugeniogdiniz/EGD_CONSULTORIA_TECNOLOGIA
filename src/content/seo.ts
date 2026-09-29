import type { Metadata } from "next";
import { SITE } from "./site";

const SOCIAL_IMAGE = {
  url: "/brand/social-cover.png",
  width: 1200,
  height: 630,
  alt: "EGD — Tecnologia que conecta projeto e operação",
};

type Title = string | { absolute: string };

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

/** Dados estruturados da organização (schema.org), para a home. */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    logo: `${SITE.url}/brand/apple-touch-icon.png`,
    description: SITE.description,
    email: SITE.email,
    areaServed: { "@type": "Country", name: "Brasil" },
    address: { "@type": "PostalAddress", addressLocality: "São Paulo", addressCountry: "BR" },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SITE.email,
      availableLanguage: "pt-BR",
      hoursAvailable: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:00", closes: "18:00" },
    },
  };
}
