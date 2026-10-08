import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { listServices } from "@/modules/crm/queries";
import { setServiceActiveForm } from "@/modules/crm/form-actions";
import { ServiceFormDialog } from "@/modules/crm/components/service-form";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatBrlCents } from "@/lib/format";

export const metadata = { title: "CRM · Serviços" };

export default async function ServicosPage() {
  const ctx = await requireOwner();
  const services = await listServices(ctx);
  return (
    <>
      <PageHeader
        title="Catálogo de serviços"
        meta="Preço de referência por unidade. No documento da proposta, os itens de investimento podem vir daqui."
        actions={<ServiceFormDialog trigger={<Button size="sm" type="button">+ Novo serviço</Button>} />}
      />
      <Block title="Serviços" aside={`${services.filter((s) => s.active).length} ativos`} padded={false}>
        {services.length === 0 ? (
          <EmptyState title="Nenhum serviço cadastrado." text="Cadastre o que a EGD vende (diagnóstico, desenvolvimento por hora, sustentação mensal…) para montar propostas mais rápido." />
        ) : (
          <div tabIndex={0} role="region" aria-label="Serviços, role horizontalmente se necessário" className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-subtle text-muted-foreground">
              <tr className="text-left">
                <th className="h-10 px-4 font-medium">Serviço</th>
                <th className="h-10 px-4 text-right font-medium">Preço de referência</th>
                <th className="h-10 px-4 font-medium">Unidade</th>
                <th className="h-10 px-4 font-medium">Status</th>
                <th className="h-10 px-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className={cn("border-t border-border align-top", !s.active && "text-muted-foreground")} data-testid={`servico-${s.id}`}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{s.name}</div>
                    {s.description && <div className="type-micro text-muted-foreground">{s.description}</div>}
                  </td>
                  <td className="type-data px-4 py-2.5 text-right">{formatBrlCents(s.defaultPriceCents)}</td>
                  <td className="px-4 py-2.5">{s.unit}</td>
                  <td className="px-4 py-2.5">{s.active ? "ativo" : "inativo"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      <ServiceFormDialog service={s} trigger={<Button variant="outline" size="sm" type="button">Editar</Button>} />
                      <form action={setServiceActiveForm}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="active" value={s.active ? "0" : "1"} />
                        <Button type="submit" variant="ghost" size="sm">{s.active ? "Desativar" : "Reativar"}</Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Block>
    </>
  );
}
