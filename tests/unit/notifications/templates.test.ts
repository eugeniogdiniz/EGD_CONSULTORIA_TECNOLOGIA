import { it, expect } from "vitest";
import { renderDeliverableDoneNotification, renderMeetingSharedNotification, renderTeamCommentNotification } from "@/modules/mail/templates";

it("comentário da equipe: assunto com a entrega e corpo escapado", () => {
  const m = renderTeamCommentNotification({ projectTitle: "P <1>", deliverableTitle: "Laudo", body: "<b>oi</b>", url: "https://x/portal/p" });
  expect(m.subject).toBe("A EGD comentou em Laudo");
  expect(m.html).toContain("&lt;b&gt;oi&lt;/b&gt;");
  expect(m.html).toContain("P &lt;1&gt;");
  expect(m.text).toContain("https://x/portal/p");
});

it("entrega concluída menciona o arquivo só quando existe", () => {
  const com = renderDeliverableDoneNotification({ projectTitle: "P", deliverableTitle: "Laudo", hasFile: true, url: "https://x/a" });
  const sem = renderDeliverableDoneNotification({ projectTitle: "P", deliverableTitle: "Laudo", hasFile: false, url: "https://x/a" });
  expect(com.subject).toBe("Entrega concluída: Laudo");
  expect(com.text).toContain("arquivo");
  expect(sem.text).not.toContain("arquivo");
});

it("ata compartilhada traz título e data", () => {
  const m = renderMeetingSharedNotification({ meetingTitle: "Kickoff", heldAt: "02/10/2026", url: "https://x/portal/atas/1" });
  expect(m.subject).toBe("Ata compartilhada: Kickoff");
  expect(m.html).toContain("02/10/2026");
  expect(m.html).toContain('href="https://x/portal/atas/1"');
});
