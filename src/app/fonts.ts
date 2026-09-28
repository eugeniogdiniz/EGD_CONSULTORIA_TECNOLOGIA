import { Archivo, Fragment_Mono } from "next/font/google";

/** Famílias compartilhadas por site, autenticação e portais. */
export const fontSans = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
  variable: "--font-sans",
});

export const fontMono = Fragment_Mono({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  variable: "--font-mono",
});
