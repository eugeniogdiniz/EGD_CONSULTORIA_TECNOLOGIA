"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/shell/field-error";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { convertLeadForm } from "@/modules/crm/form-actions";
import { buildDefaultOpportunityTitle } from "@/modules/crm/convert-lead";
import type { ActionResult } from "@/lib/action-result";

type Suggestion = { id: string; name: string; cnpj: string | null } | null;

type LeadInfo = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
};

export function ConvertLeadDialog({
  lead,
  suggestion,
  trigger,
}: {
  lead: LeadInfo;
  suggestion: Suggestion;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"link" | "create">(suggestion ? "link" : "create");

  const [state, formAction, pending] = useActionState<
    ActionResult<{ companyId: string; contactId: string; opportunityId: string }> | null,
    FormData
  >(
    async (prev, fd) => {
      const r = await convertLeadForm(prev, fd);
      // convertLeadForm redireciona em sucesso, não devolve controle aqui.
      return r;
    },
    null,
  );
  const fe = state && !state.ok ? state.fieldErrors : undefined;

  const defaultTitle = buildDefaultOpportunityTitle(lead.name);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Converter {lead.name} em empresa</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="grid gap-5">
          <input type="hidden" name="leadId" value={lead.id} />
          <input type="hidden" name="mode" value={mode} />

          {/* Lead — resumo */}
          <section className="grid gap-1.5 rounded-sm border border-border bg-subtle p-3 text-sm">
            <div><span className="type-micro text-muted-foreground">Nome:</span> {lead.name}</div>
            <div><span className="type-micro text-muted-foreground">E-mail:</span> <span className="type-data">{lead.email}</span></div>
            {lead.company && <div><span className="type-micro text-muted-foreground">Empresa (informada):</span> {lead.company}</div>}
            {lead.phone && <div><span className="type-micro text-muted-foreground">Telefone:</span> {lead.phone}</div>}
            <div className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{lead.message}</div>
          </section>

          {/* Empresa */}
          <section>
            <h3 className="mb-2 text-sm font-semibold">1. Empresa</h3>
            {suggestion && (
              <label className={`mb-2 flex items-start gap-3 rounded-sm border p-3 cursor-pointer text-sm ${mode === "link" ? "border-link bg-link-soft" : "border-strong hover:bg-subtle"}`}>
                <input type="radio" name="_mode" value="link" checked={mode === "link"} onChange={() => setMode("link")} className="mt-0.5" />
                <div>
                  <div className="font-medium">
                    Vincular a &quot;{suggestion.name}&quot;{" "}
                    <span className="ml-1 inline-flex h-4 items-center rounded-sm bg-link px-1.5 text-[0.6875rem] text-card">Recomendado</span>
                  </div>
                  <div className="type-micro text-muted-foreground">Empresa existente com o mesmo domínio de e-mail.</div>
                </div>
              </label>
            )}
            <label className={`flex items-start gap-3 rounded-sm border p-3 cursor-pointer text-sm ${mode === "create" ? "border-link bg-link-soft" : "border-strong hover:bg-subtle"}`}>
              <input type="radio" name="_mode" value="create" checked={mode === "create"} onChange={() => setMode("create")} className="mt-0.5" />
              <div>
                <div className="font-medium">Criar empresa nova</div>
                <div className="type-micro text-muted-foreground">Preencha os dados básicos abaixo.</div>
              </div>
            </label>

            {mode === "link" && suggestion && <input type="hidden" name="linkCompanyId" value={suggestion.id} />}
            {mode === "create" && (
              <div className="mt-3 grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="cl-name">Nome da empresa</Label>
                  <Input id="cl-name" name="companyName" defaultValue={lead.company ?? ""} required aria-invalid={fe?.name ? true : undefined} />
                  <FieldError errors={fe?.name} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cl-cnpj">CNPJ <span className="font-normal text-faint">opcional</span></Label>
                    <Input id="cl-cnpj" name="companyCnpj" inputMode="numeric" aria-invalid={fe?.cnpj ? true : undefined} />
                    <FieldError errors={fe?.cnpj} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="cl-site">Site <span className="font-normal text-faint">opcional</span></Label>
                    <Input id="cl-site" name="companyWebsite" placeholder="empresa.com.br" />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Contato */}
          <section className="grid gap-3">
            <h3 className="text-sm font-semibold">2. Contato</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cl-cname">Nome</Label>
                <Input id="cl-cname" name="contactName" defaultValue={lead.name} required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cl-crole">Papel</Label>
                <select id="cl-crole" name="contactRole" defaultValue="primary" className="h-10 rounded-sm border border-input bg-card px-3 text-sm">
                  <option value="primary">Principal</option>
                  <option value="technical">Técnico</option>
                  <option value="financial">Financeiro</option>
                  <option value="other">Outro</option>
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cl-cemail">E-mail</Label>
                <Input id="cl-cemail" name="contactEmail" type="email" defaultValue={lead.email} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cl-cphone">Telefone</Label>
                <Input id="cl-cphone" name="contactPhone" defaultValue={lead.phone ?? ""} />
              </div>
            </div>
          </section>

          {/* Oportunidade */}
          <section className="grid gap-3">
            <h3 className="text-sm font-semibold">3. Oportunidade</h3>
            <div className="grid gap-1.5">
              <Label htmlFor="cl-otitle">Título</Label>
              <Input id="cl-otitle" name="opportunityTitle" defaultValue={defaultTitle} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="cl-ovalue">Valor <span className="font-normal text-faint">em cents, opcional</span></Label>
                <Input id="cl-ovalue" name="opportunityValueCents" type="number" min={0} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cl-onext">Próximo passo <span className="font-normal text-faint">opcional</span></Label>
                <Input id="cl-onext" name="opportunityNextStep" placeholder="Ex.: agendar reunião" />
              </div>
            </div>
          </section>

          <div className="rounded-sm border-l-3 border-warning bg-warning-soft px-3 py-2 text-xs">
            <span className="type-data font-medium text-warning">nota:</span>{" "}
            <span>O lead sobrevive. Vai pro filtro &quot;Convertidos&quot; com link para a empresa.</span>
          </div>

          {state && !state.ok && !fe && (
            <p role="alert" className="text-sm text-danger">{state.error}</p>
          )}

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Convertendo…" : "Converter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
