import { requirePortal } from "@/modules/auth/context";
import { listPortalMeetings } from "@/modules/meetings/queries";
import { MeetingList } from "@/modules/meetings/components/meeting-parts";
import { PageHeader } from "@/components/shell/page-header";

export const metadata = { title: "Atas" };

export default async function PortalAtasPage() {
  const ctx = await requirePortal();
  const items = await listPortalMeetings(ctx);
  return (
    <>
      <PageHeader title="Atas" meta="Registros das reuniões com a equipe da EGD." />
      <MeetingList
        items={items}
        hrefFor={(id) => `/portal/atas/${id}`}
        empty={{ title: "Nenhuma ata compartilhada.", text: "Quando a equipe compartilhar a ata de uma reunião, ela aparece aqui." }}
      />
    </>
  );
}
