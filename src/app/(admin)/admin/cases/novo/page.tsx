import { requireAdmin } from "@/modules/auth/context";
import { createCaseForm } from "@/modules/cases/form-actions";
import { CaseForm } from "@/modules/cases/components/case-form";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Novo case" };

export default async function NovoCasePage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Novo case" meta="Aparece em /cases assim que estiver publicado." />
      <Block title="Dados">
        <CaseForm action={createCaseForm} submitLabel="Criar case" />
      </Block>
    </>
  );
}
