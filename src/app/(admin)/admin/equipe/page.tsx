import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { listPendingTeamInvitations, listTeam, ROLE_LABEL, type TeamRole } from "@/modules/team/queries";
import { resendTeamInvitationForm, setTeamUserActiveForm, setUserRoleForm } from "@/modules/team/form-actions";
import { TeamInviteForm } from "@/modules/team/components/team-invite-form";
import { PageHeader, Block } from "@/components/shell/page-header";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Equipe" };

export default async function EquipePage() {
  const ctx = await requireOwner();
  const [team, invites] = await Promise.all([listTeam(ctx), listPendingTeamInvitations(ctx)]);
  const admins = team.filter((u) => u.role === "admin" && u.active).length;
  return (
    <>
      <PageHeader title="Equipe" meta="Quem opera o sistema pela EGD. Clientes ficam em Organizações." />
      <Block title="Convidar para a equipe">
        <TeamInviteForm />
      </Block>
      <Block title="Pessoas" aside={`${team.filter((u) => u.active).length} ativas · ${admins} admin${admins === 1 ? "" : "s"}`} padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-subtle text-left text-muted-foreground">
                <th className="h-10 px-4 font-medium">Nome</th>
                <th className="h-10 px-4 font-medium">Papel</th>
                <th className="h-10 px-4 font-medium">2FA</th>
                <th className="h-10 px-4 font-medium">Último login</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {team.map((u) => {
                const self = u.id === ctx.user.id;
                const role = u.role as TeamRole;
                return (
                  <tr key={u.id} className={cn("border-t border-border align-top", !u.active && "text-muted-foreground")} data-testid={`equipe-${u.email}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name}{self && <span className="ml-2 type-micro text-faint">(você)</span>}</div>
                      <div className="type-data text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      {self || !u.active ? (
                        ROLE_LABEL[role]
                      ) : (
                        <form action={setUserRoleForm} className="flex items-center gap-2">
                          <input type="hidden" name="userId" value={u.id} />
                          <label className="sr-only" htmlFor={`role-${u.id}`}>Papel de {u.name}</label>
                          <select id={`role-${u.id}`} name="role" defaultValue={role} className="h-8 rounded-sm border border-input bg-card px-2 text-sm">
                            <option value="collaborator">Colaborador</option>
                            <option value="admin">Administrador</option>
                          </select>
                          <Button type="submit" size="sm" variant="outline">Mudar</Button>
                        </form>
                      )}
                    </td>
                    <td className="px-4 py-3">{u.twoFactorEnabled ? <span className="text-success">ativo</span> : <span className="text-warning">desligado</span>}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{u.lastLoginAt ? formatDateTime(new Date(u.lastLoginAt)) : "nunca"}</td>
                    <td className="px-4 py-3">{u.active ? "ativa" : "desativada"}</td>
                    <td className="px-4 py-3">
                      {!self && (
                        <ConfirmAction
                          trigger={<Button size="sm" variant={u.active ? "outline" : "default"}>{u.active ? "Desativar" : "Reativar"}</Button>}
                          title={u.active ? `Desativar ${u.name}?` : `Reativar ${u.name}?`}
                          description={u.active ? "A pessoa perde o acesso agora e as sessões abertas são encerradas. O histórico dela permanece." : "A pessoa volta a conseguir entrar com a senha atual."}
                          confirmLabel={u.active ? "Desativar" : "Reativar"}
                          destructive={u.active}
                          action={setTeamUserActiveForm}
                          fields={{ userId: u.id, active: u.active ? "0" : "1" }}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Block>
      <Block title="Convites pendentes" aside={String(invites.length)} padded={false}>
        {invites.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum convite aguardando aceite.</p>
        ) : (
          <ul className="divide-y divide-border">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>
                  <span className="type-data">{i.email}</span> · {ROLE_LABEL[(i.role ?? "collaborator") as TeamRole]} · expira em {formatDateTime(i.expiresAt)}
                </span>
                <form action={resendTeamInvitationForm}>
                  <input type="hidden" name="invitationId" value={i.id} />
                  <Button type="submit" size="sm" variant="outline">Reenviar</Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Block>
    </>
  );
}
