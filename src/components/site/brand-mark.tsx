import brand from "@/content/brand.json";

/** Monograma EG reconstruído a partir das referências fornecidas pelo cliente. */
export function BrandMark({ className }: { className?: string }) {
  return <svg viewBox={brand.symbolViewBox} fill="none" aria-hidden="true" className={className}>
    <path d={brand.symbolUpper} fill="var(--brand-signal, #0875E1)" />
    <path d={brand.symbolLower} fill="currentColor" />
  </svg>;
}

/** Letras em curvas: mesma geometria do kit SVG. */
export function BrandWordmark({ className }: { className?: string }) {
  return <svg viewBox={brand.wordmarkViewBox} fill="currentColor" aria-hidden="true" className={className}>
    {brand.wordmark.map((d) => <path key={d} d={d} fillRule="evenodd" />)}
  </svg>;
}
