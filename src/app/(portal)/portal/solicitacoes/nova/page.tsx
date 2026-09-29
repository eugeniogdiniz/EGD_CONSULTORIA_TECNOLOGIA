import { requirePortal } from "@/modules/auth/context";
import { listPortalProjects } from "@/modules/portal-projects/queries";
import { createRequestForm } from "@/modules/requests/form-actions";
import { RequestForm } from "@/modules/requests/components/request-form";
import { PageHeader, Block } from "@/components/shell/page-header";

export const metadata = { title: "Nova solicitação" };

export default async function PortalNovaSolicitacaoPage() {
  const ctx = await requirePortal();
  const projects = await listPortalProjects(ctx);
  return (
    <>
      <PageHeader title="Nova solicitação" meta="A equipe da EGD responde por aqui e por e-mail, em até um dia útil." />
      <Block title="Dados">
        <RequestForm action={createRequestForm} projects={projects.map((p) => ({ id: p.id, title: p.title }))} />
      </Block>
    </>
  );
}
