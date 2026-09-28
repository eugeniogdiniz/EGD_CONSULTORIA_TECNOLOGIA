"use client";

import { useTransition } from "react";
import { setActiveOrganization } from "@/modules/tenancy/org-cookie-action";
import type { OrgSummary } from "@/modules/auth/resolve-organization";

/** Seletor de organização ativa (só aparece com mais de uma). Select nativo: acessível e sem hidratação frágil. */
export function OrgSwitcher({ current, options }: { current: OrgSummary; options: OrgSummary[] }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      aria-label="Organização"
      value={current.id}
      disabled={pending}
      onChange={(e) => {
        const id = e.target.value;
        startTransition(() => setActiveOrganization(id));
      }}
      className="h-8 rounded-sm border border-input bg-card pr-8 pl-3 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-link-soft"
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
