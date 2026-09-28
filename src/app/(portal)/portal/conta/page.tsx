import { requirePortal } from "@/modules/auth/context";
import { PageHeader } from "@/components/shell/page-header";
import { AccountForm } from "@/modules/auth/components/account-form";

export const metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const ctx = await requirePortal();
  return (
    <>
      <PageHeader title="Minha conta" meta={ctx.user.email} />
      <AccountForm name={ctx.user.name} />
    </>
  );
}
