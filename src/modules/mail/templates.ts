/**
 * Templates de e-mail transacional. Funções puras: recebem dados, devolvem
 * assunto, texto e HTML. Todo valor dinâmico passa por `esc` no HTML.
 */
export type MailContent = { subject: string; text: string; html: string };

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

function layout(title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
<body style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:24px;color:#111;line-height:1.5">
  <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
  ${body}
  <p style="margin-top:32px;font-size:12px;color:#666">EGD Consultoria &amp; Tecnologia · egdsystem.com.br</p>
</body>
</html>`;
}

export function renderInvitation(p: { organizationName: string; acceptUrl: string }): MailContent {
  const subject = `Acesso ao portal EGD: ${p.organizationName}`;
  const text = [
    `Você foi convidado para o portal da ${p.organizationName} na EGD.`,
    "",
    `Crie sua senha em: ${p.acceptUrl}`,
    "",
    "O link vale por 7 dias.",
  ].join("\n");
  const html = layout(
    subject,
    `<p>Você foi convidado para o portal da <strong>${esc(p.organizationName)}</strong> na EGD.</p>
  <p><a href="${esc(p.acceptUrl)}">Criar minha senha</a></p>
  <p>O link vale por 7 dias.</p>`,
  );
  return { subject, text, html };
}

export function renderPasswordReset(p: { url: string }): MailContent {
  const subject = "Redefinição de senha · EGD";
  const text = [
    `Para redefinir sua senha acesse: ${p.url}`,
    "",
    "O link vale por 1 hora. Se não foi você, ignore este e-mail.",
  ].join("\n");
  const html = layout(
    subject,
    `<p><a href="${esc(p.url)}">Redefinir senha</a></p>
  <p>O link vale por 1 hora. Se não foi você, ignore este e-mail.</p>`,
  );
  return { subject, text, html };
}

export function renderLeadNotification(p: {
  name: string;
  email: string;
  company: string | null;
  message: string;
}): MailContent {
  const subject = `Novo contato pelo site: ${p.name}${p.company ? ` (${p.company})` : ""}`;
  const text = [`Nome: ${p.name}`, `E-mail: ${p.email}`, `Empresa: ${p.company ?? "-"}`, "", p.message].join("\n");
  const html = layout(
    subject,
    `<p><strong>Nome:</strong> ${esc(p.name)}<br>
  <strong>E-mail:</strong> ${esc(p.email)}<br>
  <strong>Empresa:</strong> ${esc(p.company ?? "-")}</p>
  <pre style="white-space:pre-wrap;font-family:inherit">${esc(p.message)}</pre>`,
  );
  return { subject, text, html };
}
