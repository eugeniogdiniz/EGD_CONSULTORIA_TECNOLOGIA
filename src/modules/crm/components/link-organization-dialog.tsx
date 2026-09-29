"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { linkCompanyForm } from "@/modules/crm/form-actions";

type Org = { id: string; name: string; status: "active" | "inactive" };

export function LinkOrganizationDialog({
  companyId,
  currentOrganizationId,
  organizations,
  trigger,
}: {
  companyId: string;
  currentOrganizationId: string | null;
  organizations: Org[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular ao portal do cliente</DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            await linkCompanyForm(fd);
            setOpen(false);
          }}
          className="grid gap-4"
        >
          <input type="hidden" name="companyId" value={companyId} />
          <div className="grid gap-1.5">
            <Label htmlFor="l-org">Organização</Label>
            <select
              id="l-org"
              name="organizationId"
              defaultValue={currentOrganizationId ?? ""}
              className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
            >
              <option value="">Sem vínculo</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                  {o.status === "inactive" ? " (inativa)" : ""}
                </option>
              ))}
            </select>
            <span className="type-micro text-muted-foreground">
              Os usuários dessa organização passam a ver, no portal, os projetos desta empresa.
            </span>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
