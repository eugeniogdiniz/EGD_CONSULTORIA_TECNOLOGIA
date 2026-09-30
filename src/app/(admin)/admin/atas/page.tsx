import Link from "next/link";
import { requireAdmin } from "@/modules/auth/context";
import { listCompaniesForMeeting, listMeetings } from "@/modules/meetings/queries";
import { MeetingList } from "@/modules/meetings/components/meeting-parts";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Atas" };

const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function AtasPage({ searchParams }: PageProps<"/admin/atas">) {
  const ctx = await requireAdmin();
  const sp = await searchParams;
  const companyId = str(sp.empresa);
  const [items, companies] = await Promise.all([
    listMeetings(ctx, { companyId: companyId || undefined }),
    listCompaniesForMeeting(ctx),
  ]);

  return (
    <>
      <PageHeader
        title="Atas"
        meta="Reuniões registradas com clientes: participantes, decisões e itens de ação."
        actions={<Button size="sm" render={<Link href={companyId ? `/admin/atas/nova?empresa=${companyId}` : "/admin/atas/nova"} />}>Nova ata</Button>}
      />
      <form method="get" className="flex flex-wrap items-end gap-3" aria-label="Filtros">
        <div className="grid gap-1.5">
          <Label htmlFor="f-empresa">Empresa</Label>
          <select id="f-empresa" name="empresa" defaultValue={companyId} className="h-9 rounded-sm border border-input bg-card px-3 text-sm">
            <option value="">Todas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <Button type="submit" variant="secondary" size="sm">Filtrar</Button>
      </form>
      <MeetingList
        items={items}
        hrefFor={(id) => `/admin/atas/${id}`}
        empty={{ title: "Nenhuma ata registrada.", text: "Registre a primeira reunião para guardar decisões e transformar combinados em entregas." }}
      />
    </>
  );
}
