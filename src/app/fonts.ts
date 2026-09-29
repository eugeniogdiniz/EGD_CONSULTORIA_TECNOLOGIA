import { Archivo, Fragment_Mono } from "next/font/google";

/** Famílias compartilhadas por site, autenticação e portais. */
export const fontSans = Archivo({
  // só "latin": cobre todo o português (à á â ã ç é ê í ó ô õ ú) e a pontuação tipográfica;
  // "latin-ext" dobrava o download (o next/font faz preload de todos os subconjuntos declarados)
  subsets: ["latin"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
  variable: "--font-sans",
});

export const fontMono = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  variable: "--font-mono",
});
