"use client";

import type { ReactNode } from "react";
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

/** Botão que abre um diálogo de confirmação e submete uma server action com campos ocultos. */
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
  return (
    <Dialog>
      <DialogTrigger render={<span />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={action}>
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
