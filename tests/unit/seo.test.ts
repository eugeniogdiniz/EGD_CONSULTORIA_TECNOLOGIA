import { describe, it, expect } from "vitest";
import { organizationJsonLd, pageMeta } from "@/content/seo";
import { SITE } from "@/content/site";

describe("pageMeta", () => {
  const m = pageMeta({ title: "Serviços", description: "Descrição da página.", path: "/servicos" });
  it("define canonical relativo (o metadataBase do layout completa a URL)", () => {
    expect(m.alternates?.canonical).toBe("/servicos");
    expect(m.openGraph).toMatchObject({ url: "/servicos", type: "website", locale: "pt_BR", siteName: "EGD" });
  });
  it("Open Graph e Twitter repetem o título completo (com o sufixo do template) e a descrição", () => {
    expect(m.openGraph).toMatchObject({ title: "Serviços · EGD", description: "Descrição da página." });
    expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Serviços · EGD" });
  });
  it("o openGraph da página substitui o do layout, então precisa levar a imagem", () => {
    expect((m.openGraph as { images: unknown[] }).images).toHaveLength(1);
  });
  it("título absoluto não ganha sufixo", () => {
    const home = pageMeta({ title: { absolute: "EGD — Home" }, description: "d", path: "/" });
    expect(home.openGraph).toMatchObject({ title: "EGD — Home" });
    expect(home.title).toEqual({ absolute: "EGD — Home" });
  });
});

describe("organizationJsonLd", () => {
  const j = organizationJsonLd();
  it("é uma Organization schema.org com a identidade do site", () => {
    expect(j["@context"]).toBe("https://schema.org");
    expect(j["@type"]).toBe("Organization");
    expect(j.name).toBe(SITE.name);
    expect(j.url).toBe(SITE.url);
    expect(j.email).toBe(SITE.email);
  });
  it("logo e contato usam URLs absolutas", () => {
    expect(j.logo.startsWith("https://")).toBe(true);
    expect(j.contactPoint.email).toBe(SITE.email);
  });
  it("serializa em JSON válido", () => {
    expect(() => JSON.parse(JSON.stringify(j))).not.toThrow();
  });
});
