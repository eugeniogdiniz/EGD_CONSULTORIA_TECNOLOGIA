import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields, twoFactorClient } from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

/** Cliente do Better Auth para formulários no navegador (login, reset, conta). */
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>(), twoFactorClient()],
});
