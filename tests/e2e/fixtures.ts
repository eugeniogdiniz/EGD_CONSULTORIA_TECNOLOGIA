import { execFileSync } from "node:child_process";

export type Fixtures = {
  orgA: { id: string; name: string };
  orgB: { id: string; name: string };
  clientA: { email: string; password: string };
  clientB: { email: string; password: string };
  fileA: { id: string };
  fileB: { id: string };
  projectA: ProjectFixture;
  projectB: ProjectFixture;
};

export type ProjectFixture = {
  id: string;
  title: string;
  visible: { id: string; title: string };
  hiddenId: string;
  hiddenTitle: string;
};

/** Roda o script de fixtures com tsx e devolve os ids/credenciais criados. */
export function createTwoOrgsWithClientsAndFiles(opts: { sharedClient?: boolean } = {}): Fixtures {
  const args = ["tsx", "--tsconfig", "tsconfig.json", "tests/e2e/seed-fixtures.ts"];
  if (opts.sharedClient) args.push("--shared");
  const out = execFileSync("npx", args, { encoding: "utf-8", shell: process.platform === "win32", stdio: ["ignore", "pipe", "inherit"] });
  const line = out.trim().split("\n").at(-1) ?? "";
  return JSON.parse(line) as Fixtures;
}
