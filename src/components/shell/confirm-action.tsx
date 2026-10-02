"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

/**
 * Botão que abre um diálogo de confirmação e submete uma server action com
 * campos ocultos. O diálogo fecha sozinho quando a action termina (sem isso,
 * uma action que só revalida a página deixaria o diálogo aberto sobre o
 * resultado).
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel,
  action,
  fields,
  destructive = true,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  action: (fd: FormData) => Promise<void>;
  fields: Record<string, string>;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          action={async (fd) => {
            await action(fd);
            setOpen(false);
          }}
        >
          {Object.entries(fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancelar</DialogClose>
            <Button type="submit" size="sm" variant={destructive ? "destructive" : "default"}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
