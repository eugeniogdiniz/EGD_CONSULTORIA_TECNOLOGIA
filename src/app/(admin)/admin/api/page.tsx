import { cn } from "cn";
import { requireAdmin } from "@/modules/auth/context";
import { listApiKeys } from "@/modules/api-keys/queries";
import { revokeApiKeyForm } from "@/modules/api-keys/form-actions";
import { ApiKeyForm } from "@/modules/api-keys/components/api-key-form";
import { ConfirmAction } from "@/components/shell/confirm-action";
import { PageHeader, Block } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { env } from "@/lib/env";

export const metadata = { title: "API" };

export default async function AdminApiPage() {
  const ctx = await requireAdmin();
  const keys = await listApiKeys(ctx);
  const base = env.BETTER_AUTH_URL.replace(/\/$/, "");

  return (
    <>
      <PageHeader
        title="API"
        meta="Chaves para integrar sistemas ao conteúdo e aos leads da EGD. O segredo aparece uma única vez, na criação."
      />

      <div className="flex flex-col gap-6">
          <Block title="Chaves" aside={`${keys.filter((k) => !k.revokedAt).length} ativas`} padded={false}>
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
                    <th className="h-10 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className={cn("border-t border-border", k.revokedAt && "text-muted-foreground")}>
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
                        {k.revokedAt ? `revogada em ${formatDateTime(k.revokedAt)}` : k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "nunca usada"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {!k.revokedAt && (
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

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
