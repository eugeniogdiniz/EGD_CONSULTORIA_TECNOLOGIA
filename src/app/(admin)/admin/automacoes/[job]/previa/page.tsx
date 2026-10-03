import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOwner } from "@/modules/auth/context";
import { baseUrl, getJob } from "@/modules/jobs/registry";
import { listDigestRecipients } from "@/modules/jobs/digests/weekly-client";
import { todayInSaoPaulo } from "@/modules/reports/dates";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Status } from "@/components/site/section";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/automacoes/[job]/previa">) {
  const { job } = await params;
  return { title: `Prévia · ${getJob(job)?.name ?? "Automação"}` };
}

export default async function PreviaPage({ params, searchParams }: PageProps<"/admin/automacoes/[job]/previa">) {
  await requireOwner();
  const { job: key } = await params;
  const job = getJob(key);
  if (!job) notFound();
  const sp = await searchParams;
  const organizationId = typeof sp.org === "string" ? sp.org : undefined;
  const now = new Date();
  const preview = await job.preview({ now, today: todayInSaoPaulo(now), baseUrl: baseUrl() }, { organizationId });
  const orgs = job.key === "semanal-cliente" ? await listDigestRecipients() : [];

  return (
    <>
      <PageHeader
        title={`Prévia · ${job.name}`}
        meta="Renderizado agora com os dados atuais. Nada foi enviado nem alterado."
        actions={
          <Button variant="outline" size="sm" render={<Link href="/admin/automacoes" />}>
            Automações
          </Button>
        }
      />

      {job.key === "semanal-cliente" && orgs.length > 0 && (
        <form method="get" className="flex flex-wrap items-center gap-2">
          <label htmlFor="org" className="text-sm text-muted-foreground">
            Organização
          </label>
          <select id="org" name="org" defaultValue={organizationId ?? orgs[0].id} className="h-9 rounded-sm border border-input bg-card px-2 text-sm text-foreground">
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.recipients.length})
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Ver
          </Button>
        </form>
      )}

      {preview.kind === "table" ? (
        <Block title="O que seria alterado" aside={preview.note} padded={false}>
          {preview.rows.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">{preview.note}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-subtle text-left text-muted-foreground">
                  {preview.columns.map((c) => (
                    <th key={c} className="h-10 px-4 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {r.map((c, j) => (
                      <td key={j} className={j === 0 ? "type-data px-4 py-2.5" : "px-4 py-2.5"}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Block>
      ) : (
        <Block title="E-mail" padded={false}>
          <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 border-b border-border px-5 py-4 text-sm">
            <dt className="type-micro text-faint">Assunto</dt>
            <dd data-testid="previa-assunto">{preview.subject}</dd>
            <dt className="type-micro text-faint">Para</dt>
            <dd className="type-data">{preview.to.length ? preview.to.join(", ") : "—"}</dd>
            <dt className="type-micro text-faint">Enviaria?</dt>
            <dd>{preview.wouldSend ? <Status tone="ok">sim, há conteúdo</Status> : <Status tone="warn">não: {preview.reason}</Status>}</dd>
          </dl>
          {preview.html ? (
            <iframe
              title="Prévia do e-mail"
              src={`/admin/automacoes/${job.key}/previa/html${organizationId ? `?org=${encodeURIComponent(organizationId)}` : ""}`}
              className="h-[70vh] w-full bg-white"
              data-testid="previa-iframe"
            />
          ) : (
            <p className="px-5 py-6 text-sm text-muted-foreground">Sem e-mail para mostrar.</p>
          )}
        </Block>
      )}
    </>
  );
}
