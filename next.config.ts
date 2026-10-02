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
  // upload de arquivos via server action: spec permite até 50 MB
  experimental: { serverActions: { bodySizeLimit: "52mb" } },
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
