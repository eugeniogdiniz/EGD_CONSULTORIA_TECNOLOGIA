/**
 * Dados estruturados (schema.org) dentro de <script type="application/ld+json">.
 * O "<" é escapado porque o JSON vai dentro de uma tag <script> e um "</script>" no
 * conteúdo fecharia a tag. Aceita um objeto ou uma lista (cada um vira um script).
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, "\\u003c") }} />
      ))}
    </>
  );
}
