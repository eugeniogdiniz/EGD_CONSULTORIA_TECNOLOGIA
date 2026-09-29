import { eq } from "drizzle-orm";
import { requireAdmin } from "@/modules/auth/context";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { PageHeader } from "@/components/shell/page-header";
import { AccountForm } from "@/modules/auth/components/account-form";
import { TwoFactorForm } from "@/modules/auth/components/two-factor-form";
import { AccountRateForm } from "@/modules/projects/components/account-rate-form";

export const metadata = { title: "Minha conta" };

export default async function AdminContaPage() {
  const ctx = await requireAdmin();
  const row = await db.query.users.findFirst({
    where: eq(users.id, ctx.user.id),
    columns: { hourlyRateCents: true, twoFactorEnabled: true },
  });
  return (
    <>
      <PageHeader title="Minha conta" meta={ctx.user.email} />
      <AccountForm name={ctx.user.name} />
      <TwoFactorForm enabled={Boolean(row?.twoFactorEnabled)} />
      <AccountRateForm initialCents={row?.hourlyRateCents ?? null} />
    </>
  );
}
