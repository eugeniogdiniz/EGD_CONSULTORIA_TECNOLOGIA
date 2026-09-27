import { Archivo, Fragment_Mono } from "next/font/google";

/** Títulos e texto. Eixo de largura (wdth) usado nos títulos: 100 a 112. */
export const fontSans = Archivo({
  subsets: ["latin", "latin-ext"],
  weight: "variable",
  axes: ["wdth"],
  display: "swap",
  variable: "--font-sans",
});

/** Só para dados tabulares, códigos e identificadores. */
export const fontMono = Fragment_Mono({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  variable: "--font-mono",
});
