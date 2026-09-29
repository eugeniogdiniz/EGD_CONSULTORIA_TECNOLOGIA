import { requirePortal } from "@/modules/auth/context";
import { PageHeader } from "@/components/shell/page-header";
import { AccountForm } from "@/modules/auth/components/account-form";
import { TwoFactorForm } from "@/modules/auth/components/two-factor-form";
import { isTwoFactorEnabled } from "@/modules/auth/two-factor";

export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const ctx = await requirePortal();
  const twoFactor = await isTwoFactorEnabled(ctx.user.id);
  return (
    <>
      <PageHeader title="Minha conta" meta={ctx.user.email} />
      <AccountForm name={ctx.user.name} />
      <TwoFactorForm enabled={twoFactor} />
    </>
  );
}
