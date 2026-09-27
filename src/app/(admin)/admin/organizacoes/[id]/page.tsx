import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/modules/auth/context";
import { getOrganization, listOrganizationMembers, listPendingInvitations } from "@/modules/tenancy/queries";
import { updateOrganizationForm, toggleOrganizationStatusForm, resendInvitationForm, setUserActiveForm } from "@/modules/tenancy/form-actions";
import { OrganizationForm } from "@/modules/tenancy/components/organization-form";
import { InviteForm } from "@/modules/tenancy/components/invite-form";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { Status } from "@/components/site/section";
import { Button } from "@/components/ui/button";
import { formatDate, daysUntil } from "@/lib/format";

export default async function OrganizacaoPage({ params }: PageProps<"/admin/organizacoes/[id]">) {
  const ctx = await requireAdmin();
  const { id } = await params;
  const org = await getOrganization(ctx, id);
  if (!org) notFound();
  const [members, invites] = await Promise.all([listOrganizationMembers(ctx, id), listPendingInvitations(ctx, id)]);
  const ativa = org.status === "active";

  return (
    <>
      <PageHeader
        title={org.name}
        meta={
          <span className="flex flex-wrap items-center gap-x-2.5">
            {ativa ? <Status tone="ok">Ativa</Status> : <Status tone="err">Inativa</Status>}
            <span className="text-faint">/</span>
            <span className="type-data">{org.slug}</span>
            <span className="text-faint">/</span>
            <span>criada em {formatDate(org.createdAt)}</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm" render={<Link href="/admin/organizacoes" />}>
              Todas as organizações
            </Button>
            <ConfirmAction
              trigger={<Button variant={ativa ? "destructive" : "default"} size="sm">{ativa ? "Inativar" : "Reativar"}</Button>}
              title={ativa ? `Inativar ${org.name}?` : `Reativar ${org.name}?`}
              description={ativa ? "Os usuários dela perdem acesso ao portal até ser reativada. Os dados continuam guardados." : "Os usuários dela voltam a acessar o portal."}
              confirmLabel={ativa ? "Inativar" : "Reativar"}
              destructive={ativa}
              action={toggleOrganizationStatusForm}
              fields={{ id: org.id, status: ativa ? "inactive" : "active" }}
            />
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="grid gap-6">
          <Block title="Usuários" aside={`${members.filter((m) => m.active).length} ativos`} padded={false}>
            {members.length === 0 ? (
              <EmptyState title="Nenhum usuário." text="Convide o primeiro pelo e-mail." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-subtle text-left text-muted-foreground">
                    <th className="h-10 px-4 font-medium">Nome</th>
                    <th className="h-10 px-4 font-medium">E-mail</th>
                    <th className="h-10 px-4 font-medium">Status</th>
                    <th className="h-10 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="h-11 px-4">{m.name}</td>
                      <td className="type-data h-11 px-4">{m.email}</td>
                      <td className="h-11 px-4">{m.active ? <Status tone="ok">Ativo</Status> : <Status tone="err">Desativado</Status>}</td>
                      <td className="h-11 px-4 text-right">
                        <form action={setUserActiveForm}>
                          <input type="hidden" name="userId" value={m.id} />
                          <input type="hidden" name="organizationId" value={org.id} />
                          <input type="hidden" name="active" value={m.active ? "0" : "1"} />
                          <Button type="submit" variant="link" size="sm">
                            {m.active ? "Desativar" : "Ativar"}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Block>

          <Block title="Convites pendentes" aside={String(invites.length)} padded={false}>
            {invites.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum convite aguardando aceite.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-subtle text-left text-muted-foreground">
                    <th className="h-10 px-4 font-medium">E-mail</th>
                    <th className="h-10 px-4 font-medium">Enviado em</th>
                    <th className="h-10 px-4 font-medium">Expira em</th>
                    <th className="h-10 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {invites.map((i) => {
                    const dias = daysUntil(i.expiresAt);
                    return (
                      <tr key={i.id} className="border-t border-border">
                        <td className="type-data h-11 px-4">{i.email}</td>
                        <td className="h-11 px-4 text-muted-foreground">{formatDate(i.createdAt)}</td>
                        <td className="h-11 px-4">
                          <Status tone={dias <= 2 ? "err" : "warn"}>{dias <= 0 ? "expirado" : `${dias} dias`}</Status>
                        </td>
                        <td className="h-11 px-4 text-right">
                          <form action={resendInvitationForm}>
                            <input type="hidden" name="invitationId" value={i.id} />
                            <input type="hidden" name="organizationId" value={org.id} />
                            <Button type="submit" variant="link" size="sm">
                              Reenviar
                            </Button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Block>
        </div>

        <div className="grid gap-6">
          <Block title="Convidar por e-mail">
            <InviteForm organizationId={org.id} />
          </Block>
          <Block title="Dados">
            <OrganizationForm action={updateOrganizationForm} initial={{ id: org.id, name: org.name, cnpj: org.cnpj, slug: org.slug }} />
          </Block>
        </div>
      </div>
    </>
  );
}
