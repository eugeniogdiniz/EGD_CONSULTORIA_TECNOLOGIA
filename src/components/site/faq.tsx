import type { FaqItem } from "@/content/faq";

/**
 * Perguntas frequentes visíveis na página (não escondidas em acordeão), para que o texto
 * que vai ao JSON-LD seja o mesmo que a pessoa lê. Título em h2, perguntas em h3.
 */
export function Faq({ items, title = "Perguntas frequentes", label = "Respostas diretas" }: { items: FaqItem[]; title?: string; label?: string }) {
  return (
    <section className="brand-section container brand-faq" aria-labelledby="faq-titulo">
      <div className="brand-section-heading">
        <span className="brand-label">{label}</span>
        <div><h2 id="faq-titulo">{title}</h2></div>
      </div>
      <dl className="brand-faq-list">
        {items.map((item) => (
          <div key={item.q} className="brand-faq-item">
            <dt><h3>{item.q}</h3></dt>
            <dd><p>{item.a}</p></dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
