/** E-mails são comparados sempre em minúsculas e sem espaços nas pontas. */
export const normalizeEmail = (s: string) => s.trim().toLowerCase();
