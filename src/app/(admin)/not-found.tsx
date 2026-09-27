import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Visto por usuários sem papel de admin (requireAdmin → notFound): sem menu, não revela a área. */
export default function AdminNotFound() {
  return (
    <div className="theme-site mx-auto w-full max-w-[1180px] px-5 py-24 sm:px-6">
      <h1 className="type-h1">Página não encontrada.</h1>
      <p className="type-lead mt-4 text-muted-foreground">Verifique o endereço ou volte ao início.</p>
      <div className="mt-8">
        <Button render={<Link href="/" />}>Ir para o início</Button>
      </div>
    </div>
  );
}
