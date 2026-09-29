import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="theme-app flex min-h-full flex-1 flex-col bg-paper">
      <main className="grid flex-1 items-center gap-12 px-5 py-10 lg:grid-cols-2 lg:px-16">
        <section className="hidden max-w-[680px] lg:block">
          <Logo subtitle />
          <h2 className="mt-12 text-5xl leading-tight tracking-tight">Projeto e operação.<br />Na mesma direção.</h2>
          <p className="mt-5 max-w-md text-muted-foreground">Um espaço para conectar sua equipe, os arquivos e as entregas da EGD.</p>
          <Image className="mt-10 h-auto w-full rounded-lg" src="/brand/images/territorio-azul.webp" alt="Maquete conceitual de infraestrutura conectada." width={1536} height={1024} sizes="50vw" priority />
        </section>
        <div className="mx-auto w-full max-w-[420px]">
          <div className="rounded-lg border border-border bg-card p-8">
            <Logo />
            {children}
          </div>
          <p className="mt-4 text-center text-[0.8125rem] text-muted-foreground">
            <Link href="/" className="hover:text-signal-strong">
              Voltar ao site
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
