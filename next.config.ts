import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  agentRules: false,
  // O E2E sobe um segundo `next dev` com outro diretório de build (o lock do dev é por distDir).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  // pdfkit (PDF da proposta, Fase 16) lê fontes e dados do próprio pacote em runtime: fica fora do bundle
  serverExternalPackages: ["pdfkit"],
  // Uploads via server action: GED do projeto aceita até 100 MB por arquivo (um arquivo por
  // requisição); os demais envios, 50 MB. O proxy (src/proxy.ts) bufferiza o corpo das rotas que
  // intercepta e, sem este ajuste, corta tudo acima de 10 MB (padrão do Next 16).
  experimental: { serverActions: { bodySizeLimit: "105mb" }, proxyClientMaxBodySize: "105mb" },
  async rewrites() {
    return [
      // IndexNow: o Bing só aceita URLs abaixo da pasta do arquivo da chave, então ela precisa
      // responder na raiz (/<chave>.txt). A rota continua em /indexnow/[file].
      { source: "/:key([a-f0-9]{32}).txt", destination: "/indexnow/:key.txt" },
    ];
  },
  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      // Prévia dos e-mails das automações: documento servido para um iframe do próprio admin,
      // sem script nem recurso externo. A última entrada vence para a mesma chave.
      {
        source: "/admin/automacoes/:job/previa/html",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'; img-src data:; frame-ancestors 'self'" },
        ],
      },
    ];
  },
};
export default nextConfig;
