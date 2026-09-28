"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Arrow, LogoMark } from "./ui";

export const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/cases", label: "Cases" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // fecha o menu mobile ao trocar de rota (sem setState dentro de efeito)
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  return (
    <>
      <div className={`nav-wrap ${scrolled ? "scrolled" : ""}`}>
        <div className="container">
          <nav className="nav">
            <Link href="/" className="logo">
              <span className="logo-mark">
                <LogoMark />
              </span>
              <span className="logo-text">
                EGD<span>.</span>
              </span>
            </Link>
            <div className="nav-links">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""}>
                  {l.label}
                </Link>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/entrar" className="btn btn-ghost btn-sm nav-entrar">
                Entrar
              </Link>
              <Link href="/contato" className="btn btn-primary btn-sm">
                Fale conosco <Arrow size={13} />
              </Link>
              <button className="burger" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>
                <span></span>
              </button>
            </div>
          </nav>
        </div>
      </div>
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {[...NAV_LINKS, { href: "/entrar", label: "Entrar" }].map((l) => (
          <Link key={l.href} href={l.href}>
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}
