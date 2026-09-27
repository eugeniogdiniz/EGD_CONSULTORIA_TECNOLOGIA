import type { Metadata } from "next";
import { Container, PageTitle } from "@/components/site/section";
import { ContactForm } from "@/components/site/contact-form";
import { SITE } from "@/content/site";

export const metadata: Metadata = {
  title: "Contato",
  description: "Conte o problema. Respondemos em até um dia útil.",
};

export default function ContatoPage() {
  return (
    <>
      <PageTitle title="Conte o problema. Respondemos em um dia útil.">
        <p className="type-lead mt-5 max-w-[44rem] text-muted-foreground">
          Quanto mais contexto, melhor a resposta. Se preferir, escreva direto para{" "}
          <a href={`mailto:${SITE.email}`} className="font-medium text-link underline decoration-1 underline-offset-[3px] hover:text-signal-strong">
            {SITE.email}
          </a>
          .
        </p>
      </PageTitle>
      <Container className="pb-16 md:pb-24">
        <div className="grid items-start gap-10 md:grid-cols-[7fr_4fr] md:gap-12">
          <ContactForm />
          <dl className="border-t border-border">
            <div className="border-b border-border py-5">
              <dt className="text-sm font-medium text-muted-foreground">E-mail</dt>
              <dd className="mt-1 font-medium">{SITE.email}</dd>
              <dd className="mt-0.5 text-sm text-muted-foreground">{SITE.responseTime}</dd>
            </div>
            <div className="border-b border-border py-5">
              <dt className="text-sm font-medium text-muted-foreground">Atendimento</dt>
              <dd className="mt-1 font-medium">{SITE.hours}</dd>
              <dd className="mt-0.5 text-sm text-muted-foreground">{SITE.hoursNote}</dd>
            </div>
            <div className="border-b border-border py-5">
              <dt className="text-sm font-medium text-muted-foreground">Onde</dt>
              <dd className="mt-1 font-medium">São Paulo</dd>
              <dd className="mt-0.5 text-sm text-muted-foreground">{SITE.whereNote}</dd>
            </div>
          </dl>
        </div>
      </Container>
    </>
  );
}
