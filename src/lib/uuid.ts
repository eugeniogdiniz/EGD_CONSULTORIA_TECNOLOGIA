const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Ids vindos de URL ou formulário: evita erro 22P02 do Postgres em colunas uuid. */
export const isUuid = (s: string): boolean => UUID.test(s);
