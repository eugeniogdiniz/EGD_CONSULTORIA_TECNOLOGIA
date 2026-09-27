import type { Metadata } from "next";
import { fontSans, fontMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://egdsystem.com.br"),
  title: { default: "EGD Consultoria & Tecnologia", template: "%s · EGD" },
  description:
    "Sistemas de gestão, apps de campo e automação de relatórios para consórcios de engenharia, habitação e energia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${fontSans.variable} ${fontMono.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
