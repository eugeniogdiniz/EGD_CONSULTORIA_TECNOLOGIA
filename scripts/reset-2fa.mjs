// Recuperação de acesso: remove a verificação em duas etapas de uma conta (aparelho e códigos perdidos).
// Uso: npm run auth:reset-2fa -- pessoa@empresa.com   (precisa de acesso ao banco)
import postgres from "postgres";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email || !process.env.DATABASE_URL) {
  console.error("Uso: npm run auth:reset-2fa -- <e-mail>   (DATABASE_URL precisa estar definida)");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const [u] = await sql`select id from users where email = ${email}`;
  if (!u) {
    console.error(`Nenhum usuário com o e-mail ${email}.`);
    process.exit(1);
  }
  await sql.begin(async (tx) => {
    await tx`delete from two_factors where user_id = ${u.id}`;
    await tx`update users set two_factor_enabled = false where id = ${u.id}`;
    await tx`delete from sessions where user_id = ${u.id}`; // força novo login
    await tx`insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
             values (null, 'auth.2fa.reset', 'user', ${u.id}, ${sql.json({ via: "script" })})`;
  });
  console.log(`2FA removido de ${email}; sessões encerradas. A pessoa entra só com a senha e pode reativar em Minha conta.`);
} finally {
  await sql.end();
}
