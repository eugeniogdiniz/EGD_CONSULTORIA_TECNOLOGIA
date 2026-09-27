import { Archivo, Fragment_Mono, Space_Grotesk, JetBrains_Mono } from "next/font/google";

/** Portais e páginas de autenticação. */
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

/** Site público (identidade original): Space Grotesk nos títulos, JetBrains Mono em dados e terminal. */
export const fontSpace = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-space",
});

export const fontJetBrains = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-jetbrains",
});
