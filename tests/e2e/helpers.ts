import type { Page } from "@playwright/test";

export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@egdsystem.com.br",
  password: process.env.SEED_ADMIN_PASSWORD ?? "troque-esta-senha-local",
};

/** Abre /entrar e espera o formulário hidratar (em dev, o clique antes disso vira submit nativo). */
export async function openLogin(page: Page, query = "") {
  await page.goto(`/entrar${query}`);
  await page.locator("form[data-hydrated]").waitFor();
}

export async function loginAs(page: Page, email: string, password: string) {
  await openLogin(page);
  await page.getByLabel(/e-mail/i).fill(email);
  await page.getByLabel(/^senha$/i).fill(password);
  await page.getByRole("button", { name: /^entrar$/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/entrar"));
}

const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** Procura nas últimas mensagens do Mailpit um link cujo caminho case com o padrão. */
export async function latestMailpitLink(pattern: RegExp, to?: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=10`)).json()) as {
      messages?: { ID: string; To: { Address: string }[] }[];
    };
    for (const m of list.messages ?? []) {
      if (to && !m.To.some((t) => t.Address.toLowerCase() === to.toLowerCase())) continue;
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as { Text: string };
      const match = String(full.Text).match(/https?:\/\/\S+/g)?.find((u) => pattern.test(u));
      if (match) return match.replace(/[.,)]+$/, "");
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`e-mail com link ${pattern} não chegou no Mailpit`);
}

/** Espera chegar ao Mailpit uma mensagem cujo assunto contenha `fragment`; devolve o texto dela. */
export async function waitForMailWithSubject(fragment: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/messages?limit=20`)).json()) as {
      messages?: { ID: string; Subject: string }[];
    };
    const hit = (list.messages ?? []).find((m) => m.Subject.includes(fragment));
    if (hit) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as { Text: string };
      return String(full.Text);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`e-mail com assunto contendo "${fragment}" não chegou no Mailpit`);
}

/** Abre um grupo do menu lateral (Comercial, Operação, Financeiro…) se ainda estiver fechado: os grupos nascem recolhidos. */
export async function openMenuGroup(page: Page, name: string | RegExp) {
  const button = page.getByRole("navigation", { name: "Menu" }).getByRole("button", { name });
  if ((await button.getAttribute("aria-expanded")) !== "true") await button.click();
}
