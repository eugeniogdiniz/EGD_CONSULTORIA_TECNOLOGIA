import type { Metadata } from "next";
import { fontSans, fontMono, fontSpace, fontJetBrains } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://egdsystem.com.br"),
  title: { default: "EGD Consultoria — Engenharia de dados, sistemas e automação", template: "%s · EGD" },
  description:
    "Construímos plataformas, pipelines e produtos digitais sobre AWS, Azure e o stack Apache. Da arquitetura à entrega.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fontSans.variable} ${fontMono.variable} ${fontSpace.variable} ${fontJetBrains.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
