import { createRateLimiter } from "@/lib/rate-limit";

/** 5 tentativas de login por e-mail a cada 15 minutos (o limite por IP fica no Better Auth). */
export const loginByEmail = createRateLimiter({ windowMs: 15 * 60_000, max: 5 });
