import { requirePortal } from "@/modules/auth/context";
import { PageHeader } from "@/components/shell/page-header";
import { AccountForm } from "@/modules/auth/components/account-form";
import { TwoFactorForm } from "@/modules/auth/components/two-factor-form";
import { isTwoFactorEnabled } from "@/modules/auth/two-factor";
import { WeeklyDigestForm } from "@/modules/jobs/components/weekly-digest-form";
import { PreferencesForm } from "@/modules/notifications/components/preferences-form";
import { listPreferences } from "@/modules/notifications/queries";
import { setPreferencePortalForm } from "@/modules/notifications/form-actions";
import { db } from "@/lib/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const ctx = await requirePortal();
  const [twoFactor, org, prefs] = await Promise.all([
    isTwoFactorEnabled(ctx.user.id),
    db.query.organizations.findFirst({ where: eq(organizations.id, ctx.organization.id), columns: { weeklyDigest: true } }),
    listPreferences(ctx.user.id),
  ]);
  return (
    <>
      <PageHeader title="Minha conta" meta={ctx.user.email} />
      <AccountForm name={ctx.user.name} />
      <TwoFactorForm enabled={twoFactor} />
      <WeeklyDigestForm organizationName={ctx.organization.name} enabled={Boolean(org?.weeklyDigest)} />
      <PreferencesForm audience="client" prefs={prefs} action={setPreferencePortalForm} />
    </>
  );
}
