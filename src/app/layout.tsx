import type { Metadata } from "next";
import { fontSans, fontMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  openGraph: { images: [{ url: "/brand/social-cover.png", width: 1200, height: 630, alt: "EGD — Tecnologia que conecta projeto e operação" }], locale: "pt_BR", type: "website" },
  twitter: { card: "summary_large_image", images: ["/brand/social-cover.png"] },
  icons: { icon: "/brand/simbolo.svg", apple: "/brand/apple-touch-icon.png" },
  metadataBase: new URL("https://egdsystem.com.br"),
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
