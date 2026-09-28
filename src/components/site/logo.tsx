import Link from "next/link";
import { cn } from "cn";

export function Logo({ subtitle = false, className }: { subtitle?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-baseline gap-1.5 text-lg font-semibold tracking-tight text-foreground hover:text-foreground", className)}>
      <span aria-hidden className="relative -top-px inline-block size-2.5 border-2 border-foreground after:absolute after:inset-0.5 after:bg-signal" />
      EGD
      {subtitle && <span className="hidden text-sm font-normal text-muted-foreground sm:inline">Consultoria &amp; Tecnologia</span>}
    </Link>
  );
}
