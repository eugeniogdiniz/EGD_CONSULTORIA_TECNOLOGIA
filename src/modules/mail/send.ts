// Stub temporário: implementação real na Task 5 (módulo de e-mail).
import { logger } from "@/lib/logger";

export async function sendPasswordResetEmail(p: { to: string; url: string }): Promise<void> {
  logger.info("mail.stub.password-reset", { to: p.to, url: p.url });
}
