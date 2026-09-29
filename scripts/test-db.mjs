// Prepara o banco dos testes de integração: cria (se não existir) e aplica as
// migrations. Idempotente. Roda antes do vitest em `npm run test:integration`.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { testDatabaseUrl } from "./test-db-url.mjs";

const url = new URL(testDatabaseUrl());
const name = url.pathname.replace(/^\//, "");
if (!/^[a-z0-9_]+_test$/i.test(name)) {
  console.error(`Recusado: o banco de teste precisa terminar em "_test" (recebido "${name}").`);
  process.exit(1);
}

// cria o banco conectando em "postgres" (o banco de manutenção do servidor)
const admin = new URL(url);
admin.pathname = "/postgres";
const adminClient = postgres(admin.toString(), { max: 1 });
try {
  const [exists] = await adminClient`select 1 from pg_database where datname = ${name}`;
  if (!exists) {
    await adminClient.unsafe(`create database "${name}"`);
    console.log(`banco ${name} criado`);
  }
} finally {
  await adminClient.end();
}

const client = postgres(url.toString(), { max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
  console.log(`migrations aplicadas em ${name}`);
} finally {
  await client.end();
}
