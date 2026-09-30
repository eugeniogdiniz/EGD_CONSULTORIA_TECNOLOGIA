"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Baixar CSV e Imprimir. Some na impressão. */
export function ReportToolbar({ csvHref, note, children }: { csvHref: string; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
      {children ?? <p className="text-sm text-muted-foreground">{note}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" render={<a href={csvHref} download />}>
          Baixar CSV
        </Button>
        <Button size="sm" type="button" onClick={() => window.print()}>
          Imprimir
        </Button>
      </div>
    </div>
  );
}
