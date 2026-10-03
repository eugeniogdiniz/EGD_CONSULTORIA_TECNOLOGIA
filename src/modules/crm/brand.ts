/** Dados fixos da EGD usados no documento e no e-mail da proposta (ver docs/brand/templates/dados-comerciais.json). */
export const BRAND = {
  email: "contato@egdsystem.com.br",
  phone: "+55 (11) 94050-2208",
  site: "egdsystem.com.br",
  signerRole: "Consultor em Tecnologia",
} as const;

export const DEFAULT_PROPOSAL_MESSAGE = (p: { title: string; number: string }) =>
  `Conforme conversamos, segue a proposta ${p.number} — ${p.title}.\n\nO documento em anexo traz contexto, objetivo, entregas, premissas e investimento. Fico à disposição para ajustar o que for preciso e para agendarmos os próximos passos.`;
