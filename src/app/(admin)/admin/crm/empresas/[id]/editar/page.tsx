import { notFound } from "next/navigation";
import { requireOwner } from "@/modules/auth/context";
import { getCompany } from "@/modules/crm/queries";
import { updateCompanyForm } from "@/modules/crm/form-actions";
import { CompanyForm } from "@/modules/crm/components/company-form";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Editar empresa" };

export default async function EditarEmpresaPage({ params }: PageProps<"/admin/crm/empresas/[id]/editar">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const company = await getCompany(ctx, id);
  if (!company) notFound();

  return (
    <>
      <PageHeader title={`Editar ${company.name}`} />
      <Block title="Dados">
        <CompanyForm
          action={updateCompanyForm}
          initial={{
            legalName: company.legalName, address: company.address, representativeName: company.representativeName, representativeRole: company.representativeRole, id: company.id,
            name: company.name,
            cnpj: company.cnpj,
            website: company.website,
            industry: company.industry,
            size: company.size,
            source: company.source,
            notes: company.notes,
          }}
        />
      </Block>
    </>
  );
}
