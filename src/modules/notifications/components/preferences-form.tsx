import { Block } from "@/components/shell/page-header";
import { kindsFor, type Audience, type KindKey } from "@/modules/notifications/kinds";

/** Um interruptor por tipo: liga/desliga o e-mail. No sistema a pessoa recebe tudo. */
export function PreferencesForm({
  audience,
  prefs,
  action,
}: {
  audience: Audience;
  prefs: Partial<Record<KindKey, boolean>>;
  action: (fd: FormData) => Promise<void>;
}) {
  const kinds = kindsFor(audience).filter((k) => k.emailable);
  return (
    <Block title="Notificações por e-mail" aside="no sistema você recebe tudo">
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Tudo o que acontece aparece no sino, no topo da tela. Aqui você escolhe o que <strong>também</strong> chega por e-mail.
      </p>
      <ul className="divide-y divide-border">
        {kinds.map((k) => {
          const enabled = prefs[k.key as KindKey] ?? true;
          return (
            <li key={k.key} className="flex items-center justify-between gap-4 py-3" data-testid={`pref-${k.key}`}>
              <div>
                <div className="text-sm font-medium">{k.label}</div>
                <div className="type-micro text-muted-foreground">{k.description}</div>
              </div>
              <form action={action} className="inline-flex">
                <input type="hidden" name="kind" value={k.key} />
                <input type="hidden" name="email" value={enabled ? "0" : "1"} />
                <button
                  type="submit"
                  role="switch"
                  aria-checked={enabled}
                  aria-label={`${k.label} por e-mail: ${enabled ? "ligado" : "desligado"}`}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${enabled ? "bg-success" : "bg-border-strong"}`}
                >
                  <span className={`inline-block size-4 rounded-full bg-card shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </Block>
  );
}
