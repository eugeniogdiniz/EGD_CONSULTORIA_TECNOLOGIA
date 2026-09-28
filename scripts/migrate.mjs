// Aplica as migrations do Drizzle. JS puro para rodar na imagem standalone
// (sem tsx) antes do servidor subir. Falha => processo sai com código 1 e o
// container não inicia.
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const client = postgres(url, { max: 1 });
try {
  await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
  console.log("migrations aplicadas");
} finally {
  await client.end();
}
