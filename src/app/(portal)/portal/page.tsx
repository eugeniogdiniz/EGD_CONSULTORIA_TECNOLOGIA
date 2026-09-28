import { requirePortal } from "@/modules/auth/context";
import { PageHeader } from "@/components/shell/page-header";
import { SITE } from "@/content/site";

export const metadata = { title: "Portal" };

export default async function PortalHome() {
  const ctx = await requirePortal();
  const primeiroNome = ctx.user.name.split(/\s+/)[0];
  return (
    <>
      <PageHeader title={`Olá, ${primeiroNome}.`} meta={`Você está no portal do ${ctx.organization.name}.`} />
      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Em breve neste portal</h2>
          <p className="mt-2 text-muted-foreground">
            Acompanhamento dos projetos, abertura de solicitações e download dos documentos entregues. Estamos preparando essas áreas.
          </p>
          <ul className="mt-4 grid list-disc gap-1.5 pl-4 text-sm text-muted-foreground">
            <li>Projetos, fases e marcos</li>
            <li>Solicitações com histórico</li>
            <li>Documentos e entregáveis</li>
          </ul>
        </section>
        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Precisa de algo agora?</h2>
          <p className="mt-2 text-muted-foreground">
            Escreva para{" "}
            <a href={`mailto:${SITE.email}`} className="font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong">
              {SITE.email}
            </a>
            . Respondemos em até um dia útil.
          </p>
        </section>
      </div>
    </>
  );
}
