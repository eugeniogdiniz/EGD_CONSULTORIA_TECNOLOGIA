import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Container } from "@/components/site/section";

/** 404 global (rotas inexistentes). Usa o chrome do site. */
export default function NotFound() {
  return (
    <div className="theme-site flex min-h-full flex-1 flex-col">
      <Navbar />
      <main className="flex-1">
        <Container className="py-24">
          <h1 className="type-h1">Página não encontrada.</h1>
          <p className="type-lead mt-4 text-muted-foreground">Verifique o endereço ou volte ao início.</p>
          <div className="mt-8">
            <Button render={<Link href="/" />}>Ir para o início</Button>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
