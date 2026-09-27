import Link from "next/link";
import { FOOTER_COLUMNS, SITE } from "@/content/site";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto w-full max-w-[1180px] px-5 sm:px-6">
        <div className="grid gap-6 py-14 text-sm sm:grid-cols-2 md:grid-cols-[4fr_2.5fr_2.5fr_3fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-[30rem] text-muted-foreground">{SITE.description}</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-3 text-sm font-semibold">{col.title}</h2>
              <ul className="grid gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-muted-foreground hover:text-signal-strong">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h2 className="mb-3 text-sm font-semibold">Contato</h2>
            <ul className="grid gap-2">
              <li>
                <a href={`mailto:${SITE.email}`} className="text-muted-foreground hover:text-signal-strong">
                  {SITE.email}
                </a>
              </li>
              <li className="text-muted-foreground">{SITE.city}</li>
            </ul>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-border py-5 text-[0.8125rem] text-faint">
          <span>© {new Date().getFullYear()} {SITE.name}.</span>
          <Link href="/privacidade" className="hover:text-signal-strong">
            Política de privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
