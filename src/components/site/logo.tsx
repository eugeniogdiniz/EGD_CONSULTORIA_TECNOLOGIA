import Link from "next/link";
import { cn } from "cn";
import { BrandMark, BrandWordmark } from "./brand-mark";

export function Logo({ subtitle = false, className }: { subtitle?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="EGD — início" className={cn("inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground hover:text-foreground", className)}>
      <BrandMark className="size-9" />
      <BrandWordmark className="h-6 w-[83px]" />
      {subtitle && <span className="hidden text-sm font-normal text-muted-foreground sm:inline">Consultoria em Tecnologia</span>}
    </Link>
  );
}
