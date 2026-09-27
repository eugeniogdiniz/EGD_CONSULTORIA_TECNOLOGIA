import { it, expect, vi } from "vitest";
import { isPwnedPassword } from "@/modules/auth/hibp";

// SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
// prefixo enviado à API: 5BAA6 · sufixo comparado localmente: 1E4C9B93F3F0682250B6CF8331B7EE68FD8
const SUFFIX = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

const fakeFetch = (body: string, status = 200) =>
  vi.fn(async () => new Response(body, { status })) as unknown as typeof fetch;

it("detecta senha vazada quando o sufixo aparece na resposta", async () => {
  expect(await isPwnedPassword("password", fakeFetch(`${SUFFIX}:3861493\r\nABC:1`))).toBe(true);
});

it("retorna false quando o sufixo não aparece", async () => {
  expect(await isPwnedPassword("password", fakeFetch("ABC:1\r\nDEF:2"))).toBe(false);
});

it("ignora sufixo com contagem zero (padding da API)", async () => {
  expect(await isPwnedPassword("password", fakeFetch(`${SUFFIX}:0`))).toBe(false);
});

it("envia só os 5 primeiros caracteres do hash", async () => {
  const f = fakeFetch("ABC:1");
  await isPwnedPassword("password", f);
  const url = String((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]);
  expect(url.endsWith("/range/5BAA6")).toBe(true);
});

it("falha aberta em erro de rede", async () => {
  const boom = (async () => {
    throw new Error("net");
  }) as unknown as typeof fetch;
  expect(await isPwnedPassword("password", boom)).toBe(false);
});
