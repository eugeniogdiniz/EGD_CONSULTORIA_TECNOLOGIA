import { it, expect } from "vitest";
import { renderInvitation, renderPasswordReset, renderLeadNotification, renderClientCommentNotification } from "@/modules/mail/templates";

it("convite inclui organização e link nas versões texto e HTML", () => {
  const m = renderInvitation({ organizationName: "ACME", acceptUrl: "https://egdsystem.com.br/convite/abc" });
  expect(m.subject).toContain("ACME");
  expect(m.text).toContain("https://egdsystem.com.br/convite/abc");
  expect(m.html).toContain('href="https://egdsystem.com.br/convite/abc"');
  expect(m.text).toContain("7 dias");
});

it("reset de senha inclui link e validade de 1 hora", () => {
  const m = renderPasswordReset({ url: "https://egdsystem.com.br/redefinir-senha?token=t" });
  expect(m.html).toContain('href="https://egdsystem.com.br/redefinir-senha?token=t"');
  expect(m.text).toContain("1 hora");
});

it("notificação de lead escapa HTML da mensagem e do nome", () => {
  const m = renderLeadNotification({
    name: "<b>X</b>",
    email: "x@x.com",
    company: null,
    message: "<script>alert(1)</script>",
  });
  expect(m.html).not.toContain("<script>");
  expect(m.html).toContain("&lt;script&gt;");
  expect(m.html).not.toContain("<b>X</b>");
  expect(m.subject).toBe("Novo contato pelo site: <b>X</b>");
});

it("notificação de lead inclui empresa no assunto quando informada", () => {
  const m = renderLeadNotification({ name: "Ana", email: "a@a.com", company: "ACME", message: "oi" });
  expect(m.subject).toBe("Novo contato pelo site: Ana (ACME)");
});

it("aviso de comentário do cliente traz autor, entrega, texto e link, e escapa HTML", () => {
  const m = renderClientCommentNotification({
    authorName: "João <i>S</i>",
    organizationName: "URBHIS",
    projectTitle: "Laudo",
    deliverableTitle: "Inventário",
    body: "<script>x</script> preciso de ajuda",
    url: "https://egdsystem.com.br/admin/projetos/p/entregas/d",
  });
  expect(m.subject).toBe("Comentário de João <i>S</i> (URBHIS): Inventário");
  expect(m.text).toContain("preciso de ajuda");
  expect(m.text).toContain("https://egdsystem.com.br/admin/projetos/p/entregas/d");
  expect(m.html).toContain('href="https://egdsystem.com.br/admin/projetos/p/entregas/d"');
  expect(m.html).not.toContain("<script>");
  expect(m.html).not.toContain("<i>S</i>");
});
