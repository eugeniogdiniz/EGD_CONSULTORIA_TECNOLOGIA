"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Arrow, LogoMark } from "./ui";
import { BrandWordmark } from "@/components/site/brand-mark";
import { withoutHiddenCases } from "@/content/site";

export const NAV_LINKS = withoutHiddenCases([
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/produtos", label: "Produtos" },
  { href: "/cases", label: "Cases" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contato", label: "Contato" },
]);

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
          <nav className="nav" aria-label="Navegação principal">
            <Link href="/" className="logo" aria-label="EGD — início">
              <span className="logo-mark">
                <LogoMark />
              </span>
              <span className="logo-text">
                <BrandWordmark className="brand-wordmark" />
              </span>
            </Link>
            <div className="nav-links">
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""} aria-current={isActive(l.href) ? "page" : undefined}>
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
              <button className="burger" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen} aria-controls="menu-mobile" onClick={() => setMenuOpen((o) => !o)}>
                <span></span>
              </button>
            </div>
          </nav>
        </div>
      </div>
      <div id="menu-mobile" onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }} className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {[...NAV_LINKS, { href: "/entrar", label: "Entrar" }].map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
            {l.label}
          </Link>
        ))}
      </div>
    </>
  );
}
