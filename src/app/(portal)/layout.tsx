import { requirePortal } from "@/modules/auth/context";
import { AppShell } from "@/components/shell/app-shell";
import { OrgSwitcher } from "@/components/shell/org-switcher";
import { Bell } from "@/modules/notifications/components/bell";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/portal", label: "Início" },
  { href: "/portal/projetos", label: "Projetos" },
  { href: "/portal/atas", label: "Atas" },
  { href: "/portal/solicitacoes", label: "Solicitações" },
  { href: "/portal/conta", label: "Minha conta" },
];

export default async function PortalLayout({ children }: LayoutProps<"/">) {
  const ctx = await requirePortal({ allowWithout2fa: true });
  return (
    <AppShell
      nav={NAV}
      footer="Portal do cliente"
      user={ctx.user}
      accountHref="/portal/conta"
      title="EGD"
      bell={<Bell userId={ctx.user.id} area="portal" />}
      topRight={
        ctx.organizations.length > 1 ? (
          <OrgSwitcher current={ctx.organization} options={ctx.organizations} />
        ) : (
          <span className="hidden text-sm font-medium sm:inline">{ctx.organization.name}</span>
        )
      }
    >
      {children}
    </AppShell>
  );
}
