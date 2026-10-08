/**
 * Renderizador genérico de documentos em blocos (Fase 23): o mesmo pdfkit e o
 * mesmo visual da proposta (A4, cabeçalho com logo, rodapé paginado), mas com
 * a estrutura vindo de dados — contrato, termo de aceite e os próximos
 * documentos do kit. Sem banco; a entrada já vem resolvida.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { logger } from "@/lib/logger";
import { toWinAnsi } from "./proposal-pdf";

export type DocBlock =
  | { kind: "kicker"; text: string }
  | { kind: "title"; text: string; subtitle?: string }
  | { kind: "meta"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string; muted?: boolean }
  | { kind: "table"; columns: string[]; rows: string[][]; widths?: number[]; note?: string }
  | { kind: "signatures"; parties: { label: string; lines: string[] }[] }
  | { kind: "pagebreak" }
  | { kind: "spacer"; height?: number };

export type DocPdfInput = {
  /** texto do cabeçalho à direita, em caixa alta ("CONTRATO · CT-26-001 · V1") */
  headerLabel: string;
  /** metadados do arquivo */
  info: { title: string; subject?: string };
  blocks: DocBlock[];
  brand: { email: string; phone: string; site: string };
};

const C = { ink: "#10202C", ink600: "#4B5B67", ink400: "#7D8B95", rule: "#C8D1D6", paper: "#EEF1F2", signal: "#E4571B", blue: "#1C4F8A" };
const PAGE = { w: 595.28, h: 841.89, m: 56 };
const CONTENT_W = PAGE.w - 2 * PAGE.m;
const FOOTER_Y = PAGE.h - 40;
const BODY_BOTTOM = PAGE.h - 72;
const F = { head: "Helvetica-Bold", body: "Helvetica", bold: "Helvetica-Bold" };

function loadLogo(): Buffer | null {
  try {
    return readFileSync(path.join(process.cwd(), "public/brand/logo-horizontal.png"));
  } catch (err) {
    logger.warn("doc_pdf.logo_missing", { err: String(err) });
    return null;
  }
}

/** Larguras padrão por número de colunas (frações da área útil). */
const widthsFor = (n: number, custom?: number[]) => custom ?? (n === 2 ? [0.3, 0.7] : n === 3 ? [0.42, 0.33, 0.25] : Array.from({ length: n }, () => 1 / n));

export async function renderDocPdf(raw: DocPdfInput): Promise<Buffer> {
  const t = toWinAnsi;
  const input: DocPdfInput = { ...raw, headerLabel: t(raw.headerLabel), blocks: raw.blocks.map(sanitizeBlock) };
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 88, bottom: 72, left: PAGE.m, right: PAGE.m },
    bufferPages: true,
    info: { Title: input.info.title, Author: "EGD Consultoria & Tecnologia", Subject: input.info.subject ?? "" },
    pdfVersion: "1.7",
    lang: "pt-BR",
  });
  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const logo = loadLogo();
  const header = () => {
    const y = 40;
    if (logo) doc.image(logo, PAGE.m, y - 2, { height: 24 });
    doc.font(F.head).fontSize(8).fillColor(C.ink400).text(input.headerLabel.toUpperCase(), PAGE.m, y + 6, { width: CONTENT_W, align: "right", characterSpacing: 0.6 });
    doc.moveTo(PAGE.m, y + 34).lineTo(PAGE.w - PAGE.m, y + 34).lineWidth(0.6).strokeColor(C.rule).stroke();
    doc.x = PAGE.m;
    doc.y = doc.page.margins.top;
  };
  header();
  doc.on("pageAdded", header);
  const ensure = (h: number) => {
    if (doc.y + h > BODY_BOTTOM) doc.addPage();
  };

  for (const b of input.blocks) {
    switch (b.kind) {
      case "kicker":
        doc.font(F.head).fontSize(8).fillColor(C.signal).text(b.text.toUpperCase(), PAGE.m, doc.y, { width: CONTENT_W, characterSpacing: 1 });
        doc.moveDown(0.6);
        break;
      case "title":
        doc.font(F.head).fontSize(22).fillColor(C.ink).text(b.text, PAGE.m, doc.y, { width: CONTENT_W, lineGap: 2 });
        if (b.subtitle) doc.moveDown(0.3).font(F.body).fontSize(12).fillColor(C.ink600).text(b.subtitle, { width: CONTENT_W });
        doc.moveDown(0.8);
        break;
      case "meta":
        doc.font(F.body).fontSize(9.5).fillColor(C.ink400).text(b.text, PAGE.m, doc.y, { width: CONTENT_W });
        doc.moveDown(1);
        break;
      case "h2":
        ensure(70);
        doc.moveDown(0.4);
        doc.font(F.head).fontSize(8).fillColor(C.blue).text(b.text.toUpperCase(), PAGE.m, doc.y, { width: CONTENT_W, characterSpacing: 1 });
        doc.moveTo(PAGE.m, doc.y + 4).lineTo(PAGE.w - PAGE.m, doc.y + 4).lineWidth(0.6).strokeColor(C.rule).stroke();
        doc.moveDown(1);
        break;
      case "h3":
        ensure(56);
        doc.font(F.head).fontSize(12).fillColor(C.ink).text(b.text, PAGE.m, doc.y, { width: CONTENT_W });
        doc.moveDown(0.4);
        break;
      case "p":
        ensure(30);
        doc.font(F.body).fontSize(b.muted ? 9.5 : 10.5).fillColor(b.muted ? C.ink600 : C.ink).text(b.text, PAGE.m, doc.y, { width: CONTENT_W, lineGap: 2.5, paragraphGap: 6 });
        doc.moveDown(0.6);
        break;
      case "table":
        table(doc, b.columns, b.rows, widthsFor(b.columns.length, b.widths), ensure);
        if (b.note) doc.moveDown(0.4).font(F.body).fontSize(9.5).fillColor(C.ink600).text(b.note, PAGE.m, doc.y, { width: CONTENT_W, lineGap: 2 });
        doc.moveDown(1);
        break;
      case "signatures": {
        ensure(120);
        doc.moveDown(1.5);
        const n = Math.max(1, b.parties.length);
        const gap = 24;
        const colW = (CONTENT_W - gap * (n - 1)) / n;
        const y0 = doc.y + 28;
        b.parties.forEach((p, i) => {
          const x = PAGE.m + i * (colW + gap);
          doc.moveTo(x, y0).lineTo(x + colW, y0).lineWidth(0.6).strokeColor(C.ink).stroke();
          doc.font(F.head).fontSize(8).fillColor(C.ink400).text(p.label.toUpperCase(), x, y0 + 6, { width: colW, characterSpacing: 0.6 });
          doc.font(F.body).fontSize(9.5).fillColor(C.ink).text(p.lines.join("\n"), x, y0 + 18, { width: colW });
        });
        doc.x = PAGE.m;
        doc.y = y0 + 24 + 14 * Math.max(...b.parties.map((p) => p.lines.length), 1) + 12;
        break;
      }
      case "pagebreak":
        doc.addPage();
        break;
      case "spacer":
        doc.moveDown(b.height ?? 1);
        break;
    }
  }

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc.font(F.body).fontSize(8).fillColor(C.ink400);
    doc.text(`${input.brand.site} · ${input.brand.email} · ${input.brand.phone}`, PAGE.m, FOOTER_Y, { width: CONTENT_W * 0.75, lineBreak: false });
    doc.text(`${String(i + 1).padStart(2, "0")} / ${String(range.count).padStart(2, "0")}`, PAGE.m, FOOTER_Y, { width: CONTENT_W, align: "right", lineBreak: false });
  }
  doc.end();
  return done;
}

function table(doc: PDFKit.PDFDocument, columns: string[], rows: string[][], fractions: number[], ensure: (h: number) => void) {
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
      doc.font(bold ? F.bold : font).fontSize(size).fillColor(color).text(c || "—", x + pad, y + pad, { width: widths[i] - 2 * pad, lineGap: 1.5 });
      x += widths[i];
    });
    doc.moveTo(PAGE.m, y + h).lineTo(PAGE.w - PAGE.m, y + h).lineWidth(0.5).strokeColor(C.rule).stroke();
    doc.y = y + h;
  };
  drawRow(columns, F.head, 8.5, C.ink600, C.paper);
  rows.forEach((r, idx) => drawRow(r, F.body, 10, C.ink, null, idx === rows.length - 1 && /^total/i.test(r[0] ?? "")));
  doc.x = PAGE.m;
}

function sanitizeBlock(b: DocBlock): DocBlock {
  const t = toWinAnsi;
  switch (b.kind) {
    case "kicker": case "meta": case "h2": case "h3": return { ...b, text: t(b.text) };
    case "p": return { ...b, text: t(b.text) };
    case "title": return { ...b, text: t(b.text), subtitle: b.subtitle ? t(b.subtitle) : undefined };
    case "table": return { ...b, columns: b.columns.map(t), rows: b.rows.map((r) => r.map(t)), note: b.note ? t(b.note) : undefined };
    case "signatures": return { ...b, parties: b.parties.map((p) => ({ label: t(p.label), lines: p.lines.map(t) })) };
    default: return b;
  }
}
