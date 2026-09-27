import Link from "next/link";
import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="theme-app flex min-h-full flex-1 flex-col bg-paper">
      <main className="grid flex-1 place-items-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <div className="rounded-lg border border-border bg-card p-8">
            <Logo />
            {children}
          </div>
          <p className="mt-4 text-center text-[0.8125rem] text-faint">
            <Link href="/" className="hover:text-signal-strong">
              Voltar ao site
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
