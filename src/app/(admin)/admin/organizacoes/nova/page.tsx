import { requireAdmin } from "@/modules/auth/context";
import { createOrganizationForm } from "@/modules/tenancy/form-actions";
import { OrganizationForm } from "@/modules/tenancy/components/organization-form";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Nova organização" };

export default async function NovaOrganizacaoPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Nova organização" />
      <Block title="Dados">
        <OrganizationForm action={createOrganizationForm} />
      </Block>
    </>
  );
}
