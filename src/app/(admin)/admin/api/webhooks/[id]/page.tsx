import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { getWebhook, listDeliveries } from "@/modules/webhooks/queries";
import { resendDeliveryForm, setWebhookActiveForm } from "@/modules/webhooks/form-actions";
import { TestWebhookButton } from "@/modules/webhooks/components/webhook-form";
import { EVENT_LABEL, type WebhookEvent } from "@/modules/webhooks/sign";
import { PageHeader, Block, EmptyState } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Webhook" };

const STATUS: Record<string, string> = { ok: "text-success", pending: "text-warning", failed: "text-danger" };

export default async function WebhookPage({ params }: PageProps<"/admin/api/webhooks/[id]">) {
  const ctx = await requireOwner();
  const { id } = await params;
  const wh = await getWebhook(ctx, id);
  if (!wh) notFound();
  const deliveries = await listDeliveries(ctx, id);
  return (
    <>
      <PageHeader
        title={wh.name}
        meta={<><Link href="/admin/api" className="text-link hover:underline">API</Link> · <span className="type-data">{wh.url}</span> · {wh.active ? "ativo" : "desativado"}{wh.failureCount ? ` · ${wh.failureCount} falhas seguidas` : ""}</>}
        actions={
          <div className="flex items-center gap-2">
            <TestWebhookButton id={wh.id} />
            <form action={setWebhookActiveForm}>
              <input type="hidden" name="id" value={wh.id} />
              <input type="hidden" name="active" value={wh.active ? "0" : "1"} />
              <Button type="submit" size="sm" variant={wh.active ? "destructive" : "default"}>{wh.active ? "Desativar" : "Reativar"}</Button>
            </form>
          </div>
        }
      />
      <p className="text-sm text-muted-foreground">Eventos: {(wh.events as WebhookEvent[]).map((e) => EVENT_LABEL[e] ?? e).join(", ") || "nenhum"}.</p>
      <Block title="Últimas entregas" aside={`${deliveries.length}`} padded={false}>
        {deliveries.length === 0 ? (
          <EmptyState title="Nenhuma entrega ainda." text='Use "Testar" para enviar um ping assinado e conferir a integração.' />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-subtle text-left text-muted-foreground"><tr><th className="h-10 px-4 font-medium">Quando</th><th className="h-10 px-4 font-medium">Evento</th><th className="h-10 px-4 font-medium">Status</th><th className="h-10 px-4 font-medium">Tentativas</th><th className="h-10 px-4 font-medium">Resposta</th><th className="h-10 px-4" /></tr></thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.id} className="border-t border-border align-top" data-testid={`entrega-${d.event}`}>
                  <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{formatDateTime(d.createdAt)}</td>
                  <td className="type-data px-4 py-2">{d.event}</td>
                  <td className={cn("px-4 py-2 font-medium", STATUS[d.status])}>{d.status === "ok" ? "entregue" : d.status === "pending" ? `pendente · próxima ${formatDateTime(d.nextAttemptAt)}` : "falhou"}</td>
                  <td className="type-data px-4 py-2">{d.attempts}</td>
                  <td className="px-4 py-2 text-xs">{d.responseStatus ?? "—"}{d.error && <span className="block text-danger">{d.error}</span>}</td>
                  <td className="px-4 py-2">
                    {d.status !== "ok" && (
                      <form action={resendDeliveryForm}>
                        <input type="hidden" name="deliveryId" value={d.id} />
                        <input type="hidden" name="endpointId" value={wh.id} />
                        <Button type="submit" size="sm" variant="ghost">Reenviar</Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Block>
      <Block title="Como verificar a assinatura">
        <pre className="type-data overflow-x-auto rounded-sm border border-border bg-subtle p-3 text-xs">{`// Node: compare X-EGD-Signature com sha256=HMAC(segredo, X-EGD-Timestamp + "." + corpo)
const expected = "sha256=" + crypto.createHmac("sha256", SEGREDO).update(\`\${req.headers["x-egd-timestamp"]}.\${rawBody}\`).digest("hex");
// aceite se igual (comparação em tempo constante) e se o timestamp estiver a menos de 5 min do seu relógio`}</pre>
      </Block>
    </>
  );
}
