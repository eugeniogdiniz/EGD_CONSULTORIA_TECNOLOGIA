import { setJobEnabledForm } from "../form-actions";

/** Liga/desliga uma automação: formulário de um botão, sem JavaScript. */
export function JobSwitch({ job, enabled, name }: { job: string; enabled: boolean; name: string }) {
  return (
    <form action={setJobEnabledForm} className="inline-flex">
      <input type="hidden" name="job" value={job} />
      <input type="hidden" name="enabled" value={enabled ? "0" : "1"} />
      <button
        type="submit"
        role="switch"
        aria-checked={enabled}
        aria-label={`${name}: ${enabled ? "ligada" : "desligada"}`}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 ${enabled ? "bg-success" : "bg-border-strong"}`}
      >
        <span className={`inline-block size-4 rounded-full bg-card shadow transition-transform ${enabled ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
    </form>
  );
}
