import { requireAdmin } from "@/modules/auth/context";
import { createCompanyForm } from "@/modules/crm/form-actions";
import { CompanyForm } from "@/modules/crm/components/company-form";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Nova empresa" };

export default async function NovaEmpresaPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Nova empresa" meta="Cadastro no CRM. Empresa cliente (com portal) é criada em /admin/organizações." />
      <Block title="Dados">
        <CompanyForm action={createCompanyForm} submitLabel="Criar empresa" />
      </Block>
    </>
  );
}
