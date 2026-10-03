import { createPgRateLimiter } from "@/lib/rate-limit";
import { db } from "@/lib/db";

/** 5 tentativas de login por e-mail a cada 15 minutos, contadas no banco (vale entre containers). O limite por IP fica no Better Auth. */
export const loginByEmail = createPgRateLimiter(db, { scope: "login-email", windowMs: 15 * 60_000, max: 5 });
