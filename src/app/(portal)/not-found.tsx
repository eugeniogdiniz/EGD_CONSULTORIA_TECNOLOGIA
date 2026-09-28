import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <div className="grid gap-3 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada.</h1>
      <p className="text-muted-foreground">Verifique o endereço ou volte ao início do portal.</p>
      <div>
        <Button render={<Link href="/portal" />}>Ir para o início</Button>
      </div>
    </div>
  );
}
