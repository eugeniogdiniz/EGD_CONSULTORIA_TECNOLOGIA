import { cn } from "cn";
import { requireOwner } from "@/modules/auth/context";
import { listApiKeys } from "@/modules/api-keys/queries";
import { revokeApiKeyForm } from "@/modules/api-keys/form-actions";
import { ApiKeyForm } from "@/modules/api-keys/components/api-key-form";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";
import Link from "next/link";
import { RotateKeyButton } from "@/modules/api-keys/components/rotate-key-button";
import { listWebhooks } from "@/modules/webhooks/queries";
import { WebhookForm, TestWebhookButton } from "@/modules/webhooks/components/webhook-form";
import { setWebhookActiveForm } from "@/modules/webhooks/form-actions";
import { EVENT_LABEL, type WebhookEvent } from "@/modules/webhooks/sign";

export const metadata = { title: "API" };

export default async function AdminApiPage() {
  const ctx = await requireOwner();
  const [keys, webhooks] = await Promise.all([listApiKeys(ctx), listWebhooks(ctx)]);
  const base = env.BETTER_AUTH_URL.replace(/\/$/, "");
  const now = new Date();
  const isRevoked = (k: { revokedAt: Date | null }) => Boolean(k.revokedAt && k.revokedAt <= now);

  return (
    <>
      <PageHeader
        title="API"
        meta="Chaves para integrar sistemas ao conteúdo e aos leads da EGD. O segredo aparece uma única vez, na criação."
      />

      <div className="flex flex-col gap-6">
          <Block title="Chaves" aside={`${keys.filter((k) => !isRevoked(k)).length} ativas`} padded={false}>
            {keys.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nenhuma chave criada.</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-subtle text-left text-muted-foreground">
                    <th className="h-10 px-4 font-medium">Nome</th>
                    <th className="h-10 px-4 font-medium">Chave</th>
                    <th className="h-10 px-4 font-medium">Escopos</th>
                    <th className="h-10 px-4 font-medium">Último uso</th>
                    <th className="h-10 px-4 font-medium">Validade</th>
                    <th className="h-10 px-4"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className={cn("border-t border-border align-top", isRevoked(k) && "text-muted-foreground")}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium">{k.name}</div>
                        <div className="type-micro text-faint">
                          criada em {formatDateTime(k.createdAt)} por {k.createdByName}
                        </div>
                      </td>
                      <td className="type-data px-4 py-2.5 text-xs">{k.prefix}…</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <code key={s} className="type-data rounded-sm border border-border bg-subtle px-1.5 text-[0.7rem]">{s}</code>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {isRevoked(k) ? `revogada em ${formatDateTime(k.revokedAt as Date)}` : k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "nunca usada"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {k.expiresAt ? (k.expiresAt <= now ? <span className="text-danger">expirada em {formatDateTime(k.expiresAt)}</span> : `até ${formatDateTime(k.expiresAt)}`) : "sem expiração"}
                        {k.revokedAt && k.revokedAt > now && <span className="block text-warning">rotacionada: válida até {formatDateTime(k.revokedAt)}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!isRevoked(k) && <div className="mb-1 flex justify-end"><RotateKeyButton id={k.id} name={k.name} disabled={Boolean(k.rotatedToId)} /></div>}
                        {!isRevoked(k) && (
                          <ConfirmAction
                            trigger={<Button variant="destructive" size="sm">Revogar</Button>}
                            title={`Revogar ${k.name}?`}
                            description="Quem usa esta chave passa a receber 401 imediatamente. Não dá para desfazer."
                            confirmLabel="Revogar"
                            destructive
                            action={revokeApiKeyForm}
                            fields={{ id: k.id }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </Block>

          <Block title="Webhooks de saída" aside={`${webhooks.filter((w) => w.active).length} ativos`} padded={false}>
            {webhooks.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum webhook. Cadastre uma URL para receber leads, solicitações, propostas, entregas concluídas e parcelas pagas.</p>
            ) : (
              <ul className="divide-y divide-border">
                {webhooks.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm" data-testid={`webhook-${w.id}`}>
                    <div className="min-w-0">
                      <Link href={`/admin/api/webhooks/${w.id}`} className="font-medium text-link hover:underline">{w.name}</Link>
                      <div className="type-data truncate text-xs text-muted-foreground">{w.url}</div>
                      <div className="type-micro text-faint">{(w.events as WebhookEvent[]).map((e) => EVENT_LABEL[e] ?? e).join(", ")} · segredo {w.secretPrefix}{w.lastDeliveryAt ? ` · última entrega ${formatDateTime(w.lastDeliveryAt)}` : ""}{w.failureCount ? ` · ${w.failureCount} falhas seguidas` : ""}{!w.active ? " · desativado" : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {w.active && <TestWebhookButton id={w.id} />}
                      <form action={setWebhookActiveForm}>
                        <input type="hidden" name="id" value={w.id} />
                        <input type="hidden" name="active" value={w.active ? "0" : "1"} />
                        <Button type="submit" size="sm" variant="ghost">{w.active ? "Desativar" : "Reativar"}</Button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Block title="Novo webhook">
            <WebhookForm />
          </Block>
          <Block title="Nova chave">
            <ApiKeyForm />
          </Block>

        <Block title="Como usar">
          <div className="grid gap-4 text-xs leading-relaxed text-muted-foreground">
            <p>
              Envie <code className="type-data">Authorization: Bearer &lt;chave&gt;</code>. Limite de 120 requisições por minuto por chave.
              Erros vêm como <code className="type-data">{"{ \"error\": { \"code\", \"message\" } }"}</code>.
            </p>
            <div>
              <div className="mb-1 font-medium text-foreground">Cases publicados <code className="type-data">cases:read</code></div>
              <pre className="type-data overflow-x-auto rounded-sm border border-border bg-subtle p-2">{`curl ${base}/api/v1/cases \\
  -H "Authorization: Bearer $EGD_KEY"

curl ${base}/api/v1/cases/urbhis \\
  -H "Authorization: Bearer $EGD_KEY"`}</pre>
            </div>
            <div>
              <div className="mb-1 font-medium text-foreground">Enviar lead <code className="type-data">leads:write</code></div>
              <pre className="type-data overflow-x-auto rounded-sm border border-border bg-subtle p-2">{`curl -X POST ${base}/api/v1/leads \\
  -H "Authorization: Bearer $EGD_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Maria","email":"maria@empresa.com",
       "company":"Empresa","message":"Quero conversar..."}'`}</pre>
              <p className="mt-1">Responde <code className="type-data">201</code> com o id; entra em Leads com origem <code className="type-data">api</code>.</p>
            </div>
          </div>
        </Block>
        </div>
      </div>
    </>
  );
}
