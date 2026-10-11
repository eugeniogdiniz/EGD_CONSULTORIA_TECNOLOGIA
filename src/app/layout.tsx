import type { Metadata } from "next";
import { fontSans, fontMono } from "./fonts";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  openGraph: { images: [{ url: "/brand/social-cover.png", width: 1200, height: 630, alt: "EGD — Tecnologia que conecta projeto e operação" }], locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image", images: ["/brand/social-cover.png"] },
  icons: { icon: "/brand/simbolo.svg", apple: "/brand/apple-touch-icon.png" },
  metadataBase: new URL("https://egdsystem.com.br"),
  // Trechos, imagens e vídeos sem limite nos resultados (Google e IAs mostram a resposta inteira).
  // As páginas de acesso sobrescrevem com `index: false`.
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large", "max-video-preview": -1 } },
  applicationName: "EGD",
  authors: [{ name: "EGD Consultoria em Tecnologia", url: "https://egdsystem.com.br" }],
  creator: "EGD Consultoria em Tecnologia",
  publisher: "EGD Consultoria em Tecnologia",
  formatDetection: { email: false, address: false, telephone: false },
  // Verificação do Search Console e do Bing Webmaster Tools, só quando o token está no ambiente.
  verification: {
    ...(env.GOOGLE_SITE_VERIFICATION ? { google: env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": env.BING_SITE_VERIFICATION } } : {}),
  },
  title: { default: "EGD — Tecnologia que conecta projeto e operação", template: "%s · EGD" },
  description:
    "Consultoria, dados e sistemas para conectar pessoas e transformar a operação. Da primeira conversa ao software em produção.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fontSans.variable} ${fontMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
