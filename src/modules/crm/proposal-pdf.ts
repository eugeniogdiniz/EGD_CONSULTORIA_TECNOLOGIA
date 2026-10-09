/**
 * PDF da proposta no padrão do kit comercial (A4, cabeçalho com logo, seções numeradas, tabelas, assinaturas, rodapé paginado).
 * Sem navegador: pdfkit em JS puro. Entrada já resolvida (sem banco).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { logger } from "@/lib/logger";
import { documentSections, formatBrl, type ProposalDocument } from "./document";

export type ProposalPdfInput = {
  number: string;
  version: number;
  title: string;
  valueCents: number;
  issuedOn: string; // DD/MM/AAAA
  validUntil: string | null; // DD/MM/AAAA
  companyName: string;
  contactName: string | null;
  contactRole: string | null;
  document: ProposalDocument;
  /** quem assina pela EGD */
  signer: { name: string; role: string };
  brand: { email: string; phone: string; site: string };
};

const C = {
  ink: "#10202C",
  ink600: "#4B5B67",
  ink400: "#7D8B95",
  rule: "#C8D1D6",
  paper: "#EEF1F2",
  signal: "#E4571B",
  blue: "#1C4F8A",
};
const PAGE = { w: 595.28, h: 841.89, m: 56 };
const CONTENT_W = PAGE.w - 2 * PAGE.m;
const FOOTER_Y = PAGE.h - 40;
const BODY_BOTTOM = PAGE.h - 72;

type Fonts = { head: string; body: string; bodyBold: string };

/**
 * Fontes padrão do PDF (Helvetica), sem embutir arquivo: a Archivo do kit é
 * uma fonte variável em WOFF2 e o pdfkit embute o subconjunto sem os contornos
 * (texto invisível nos leitores). Os títulos usam Helvetica-Bold.
 */
const FONTS: Fonts = { head: "Helvetica-Bold", body: "Helvetica", bodyBold: "Helvetica-Bold" };

const REPLACE: Record<string, string> = { "→": "›", "←": "‹", "↔": "‹›", "✓": "v", "✔": "v", "≥": ">=", "≤": "<=", "≠": "!=", "…": "...", "\u00a0": " " };
/**
 * As fontes padrão só têm WinAnsi: troca o que tem equivalente e descarta o
 * resto (emoji, símbolos). Tabulações e outros caracteres de controle (texto
 * colado de planilha ou Word) viram espaço: o pdfkit codifica o \t errado e o
 * título sai embaralhado. Quebras de linha ficam (parágrafos dos textos).
 */
export function toWinAnsi(s: string): string {
  return s
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\v\f\u0000-\u0008\u000e-\u001f\u007f-\u009f]/g, " ")
    .replace(/[→←↔✓✔≥≤≠…\u00a0]/g, (c) => REPLACE[c] ?? "")
    .replace(/ {2,}/g, " ")
    .replace(/[^\u0000-\u00ff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/g, "");
}

function loadLogo(): Buffer | null {
  try {
    return readFileSync(path.join(process.cwd(), "public/brand/logo-horizontal.png"));
  } catch (err) {
    logger.warn("proposal_pdf.logo_missing", { err: String(err) });
    return null;
  }
}

export async function renderProposalPdf(raw: ProposalPdfInput): Promise<Buffer> {
  const input = sanitizeInput(raw);
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 88, bottom: 72, left: PAGE.m, right: PAGE.m },
    bufferPages: true,
    info: { Title: `Proposta ${input.number} v${input.version} · ${input.title}`, Author: "EGD Consultoria & Tecnologia", Subject: input.companyName },
    pdfVersion: "1.7",
    lang: "pt-BR",
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const fonts = FONTS;
  const logo = loadLogo();
  const header = () => {
    const y = 40;
    if (logo) doc.image(logo, PAGE.m, y - 2, { height: 24 });
    doc.font(fonts.head).fontSize(8).fillColor(C.ink400).text(`PROPOSTA COMERCIAL · ${input.number} · V${input.version}`, PAGE.m, y + 6, { width: CONTENT_W, align: "right", characterSpacing: 0.6 });
    doc.moveTo(PAGE.m, y + 34).lineTo(PAGE.w - PAGE.m, y + 34).lineWidth(0.6).strokeColor(C.rule).stroke();
    // o texto do cabeçalho move o cursor: devolve ao topo da área de conteúdo
    doc.x = PAGE.m;
    doc.y = doc.page.margins.top;
  };
  header();
  doc.on("pageAdded", header);

  const ensure = (h: number) => {
    if (doc.y + h > BODY_BOTTOM) doc.addPage();
  };
  const d = input.document;

  // ── capa: kicker, título, subtítulo, nota, tabela "preparada para"
  doc.font(fonts.head).fontSize(8).fillColor(C.signal).text("PROPOSTA COMERCIAL", { characterSpacing: 1 });
  doc.moveDown(0.6);
  doc.font(fonts.head).fontSize(24).fillColor(C.ink).text(input.title, { width: CONTENT_W, lineGap: 2 });
  if (d.subtitle) doc.moveDown(0.3).font(fonts.body).fontSize(12).fillColor(C.ink600).text(d.subtitle);
  doc.moveDown(0.8);
  const meta = [`Proposta ${input.number}`, `versão ${input.version}`, `emissão ${input.issuedOn}`, input.validUntil ? `válida até ${input.validUntil}` : null].filter(Boolean).join(" · ");
  doc.font(fonts.body).fontSize(9.5).fillColor(C.ink400).text(meta);
  doc.moveDown(1);
  table(doc, fonts, ["Preparada para", "Responsáveis"], [
    [input.companyName, [input.contactName, input.contactRole].filter(Boolean).join(" · ") || "—"],
    [d.projectName || input.title, `${input.signer.name} · ${input.signer.role}`],
  ], [0.5, 0.5], ensure);
  doc.moveDown(1.2);

  // ── seções
  const sections = documentSections(d, { valueFormatted: formatBrl(input.valueCents), place: d.place || "São Paulo", dateFormatted: input.issuedOn });
  for (const s of sections) {
    ensure(60);
    doc.font(fonts.head).fontSize(13).fillColor(C.ink).text(`${s.number} · ${s.title}`);
    doc.moveDown(0.4);
    if (s.kind === "text") {
      doc.font(fonts.body).fontSize(10.5).fillColor(C.ink).text(s.body, { width: CONTENT_W, lineGap: 2.5, paragraphGap: 6 });
    } else {
      const widths = s.columns.length === 2 ? [0.3, 0.7] : [0.42, 0.33, 0.25];
      table(doc, fonts, s.columns, s.rows, widths, ensure);
      if (s.note) doc.moveDown(0.4).font(fonts.body).fontSize(9.5).fillColor(C.ink600).text(s.note, { width: CONTENT_W, lineGap: 2 });
    }
    doc.moveDown(1.1);
  }

  // ── assinaturas
  ensure(110);
  doc.moveDown(1.5);
  const colW = (CONTENT_W - 24) / 2;
  const y0 = doc.y + 28;
  for (const [i, who] of [["CONTRATADA", `${input.signer.name}\n${input.signer.role}`], ["CONTRATANTE", `${input.contactName ?? "[Representante]"}\n${input.companyName}`]].entries()) {
    const x = PAGE.m + i * (colW + 24);
    doc.moveTo(x, y0).lineTo(x + colW, y0).lineWidth(0.6).strokeColor(C.ink).stroke();
    doc.font(fonts.head).fontSize(8).fillColor(C.ink400).text(who[0], x, y0 + 6, { width: colW, characterSpacing: 0.6 });
    doc.font(fonts.body).fontSize(9.5).fillColor(C.ink).text(who[1], x, y0 + 18, { width: colW });
  }
  doc.y = y0 + 56;
  doc.font(fonts.body).fontSize(9).fillColor(C.ink400).text("Próximos passos: validar escopo › preencher contrato e anexos › assinar › agendar início.", PAGE.m, doc.y, { width: CONTENT_W });
  doc.moveDown(0.6);
  doc.font(fonts.head).fontSize(9).fillColor(C.blue).text("Tecnologia que transforma. Soluções que geram valor.", { width: CONTENT_W });

  // ── rodapé com paginação
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // o rodapé fica abaixo da margem inferior: zera a margem para o pdfkit não abrir outra página
    doc.page.margins.bottom = 0;
    doc.font(fonts.body).fontSize(8).fillColor(C.ink400);
    doc.text(`${input.brand.site} · ${input.brand.email} · ${input.brand.phone}`, PAGE.m, FOOTER_Y, { width: CONTENT_W * 0.75, lineBreak: false });
    doc.text(`${String(i + 1).padStart(2, "0")} / ${String(range.count).padStart(2, "0")}`, PAGE.m, FOOTER_Y, { width: CONTENT_W, align: "right", lineBreak: false });
  }
  doc.end();
  return done;
}

/** Tabela simples com cabeçalho em papel-100, linhas com quebra e quebra de página por linha. */
function table(doc: PDFKit.PDFDocument, fonts: Fonts, columns: string[], rows: string[][], fractions: number[], ensure: (h: number) => void) {
  const pad = 6;
  const widths = fractions.map((f) => f * CONTENT_W);
  const rowHeight = (cells: string[], font: string, size: number) => {
    doc.font(font).fontSize(size);
    return Math.max(...cells.map((c, i) => doc.heightOfString(c || "—", { width: widths[i] - 2 * pad, lineGap: 1.5 }))) + 2 * pad;
  };
  const drawRow = (cells: string[], font: string, size: number, color: string, bg: string | null, bold = false) => {
    const h = rowHeight(cells, font, size);
    ensure(h + 2);
    const y = doc.y;
    if (bg) doc.rect(PAGE.m, y, CONTENT_W, h).fill(bg);
    let x = PAGE.m;
    cells.forEach((c, i) => {
      doc.font(bold ? fonts.bodyBold : font).fontSize(size).fillColor(color).text(c || "—", x + pad, y + pad, { width: widths[i] - 2 * pad, lineGap: 1.5 });
      x += widths[i];
    });
    doc.moveTo(PAGE.m, y + h).lineTo(PAGE.w - PAGE.m, y + h).lineWidth(0.5).strokeColor(C.rule).stroke();
    doc.y = y + h;
  };
  drawRow(columns, fonts.head, 8.5, C.ink600, C.paper);
  rows.forEach((r, idx) => drawRow(r, fonts.body, 10, C.ink, null, idx === rows.length - 1 && r[0] === "Total"));
  doc.x = PAGE.m;
}

function sanitizeInput(i: ProposalPdfInput): ProposalPdfInput {
  const t = (v: string) => toWinAnsi(v);
  const d = i.document;
  return {
    ...i,
    title: t(i.title),
    companyName: t(i.companyName),
    contactName: i.contactName ? t(i.contactName) : null,
    contactRole: i.contactRole ? t(i.contactRole) : null,
    document: {
      ...d,
      subtitle: t(d.subtitle),
      projectName: t(d.projectName),
      context: t(d.context),
      objective: t(d.objective),
      approach: d.approach.map((a) => ({ stage: t(a.stage), description: t(a.description) })),
      deliverables: d.deliverables.map((x) => ({ title: t(x.title), acceptance: t(x.acceptance), due: t(x.due) })),
      assumptions: t(d.assumptions),
      scopeLimits: t(d.scopeLimits),
      governance: t(d.governance),
      technology: t(d.technology),
      investment: d.investment.map((x) => ({ item: t(x.item), amountCents: x.amountCents, condition: t(x.condition) })),
      paymentTerms: t(d.paymentTerms),
      continuity: t(d.continuity),
      place: t(d.place),
    },
  };
}
