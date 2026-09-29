// URL do banco usado pelos testes de integração. Sempre um banco separado do
// de desenvolvimento: TEST_DATABASE_URL, ou DATABASE_URL com o nome + "_test".
export function testDatabaseUrl(env = process.env) {
  if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL ausente (necessária para derivar o banco de teste)");
  const url = new URL(env.DATABASE_URL);
  const name = url.pathname.replace(/^\//, "");
  if (!name) throw new Error("DATABASE_URL sem nome de banco");
  url.pathname = `/${name.endsWith("_test") ? name : `${name}_test`}`;
  return url.toString();
}
