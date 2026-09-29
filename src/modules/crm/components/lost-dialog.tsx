"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { changeOpportunityStageForm } from "@/modules/crm/form-actions";

export function LostDialog({
  opportunityId,
  trigger,
}: {
  opportunityId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como perdida</DialogTitle>
        </DialogHeader>
        <form action={changeOpportunityStageForm} className="grid gap-4">
          <input type="hidden" name="id" value={opportunityId} />
          <input type="hidden" name="to" value="lost" />
          <div className="grid gap-1.5">
            <Label htmlFor="l-reason">Por que foi perdida?</Label>
            <Input id="l-reason" name="lostReason" required minLength={3} placeholder="Ex.: fora de orçamento" />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" type="button" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" variant="destructive">Marcar como perdida</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
