/* EGD Shared chrome — Navbar, Footer, Logo, Icon helpers */
const { useState, useEffect, useRef } = React;

const Icon = ({ d, stroke = "currentColor", fill = "none", size = 20, vb = 24, className }) => (
  <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const LogoMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5 H16" stroke="var(--accent)" />
    <path d="M5 12 H13" />
    <path d="M5 19 H16" stroke="var(--accent)" />
    <path d="M19 5 L19 19" stroke="var(--accent)" />
  </svg>
);

const Arrow = ({ size = 14, className = "arr" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const ArrowUR = ({ size = 14 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

const Plus = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/* Navigation links shared across pages */
const NAV_LINKS = [
  { href: "index.html",     label: "Início",   match: ["index.html", "/"] },
  { href: "servicos.html",  label: "Serviços", match: ["servicos.html"] },
  { href: "produtos.html",  label: "Produtos", match: ["produtos.html"] },
  { href: "sobre.html",     label: "Sobre",    match: ["sobre.html"] },
  { href: "contato.html",   label: "Contato",  match: ["contato.html"] }
];

const isActive = (link) => {
  const path = location.pathname.split("/").pop() || "index.html";
  return link.match.some(m => path === m || (m === "/" && path === ""));
};

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className={`nav-wrap ${scrolled ? "scrolled" : ""}`}>
        <div className="container">
          <nav className="nav">
            <a href="index.html" className="logo">
              <span className="logo-mark"><LogoMark /></span>
              <span className="logo-text">EGD<span>.</span></span>
            </a>
            <div className="nav-links">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} className={isActive(l) ? "active" : ""}>{l.label}</a>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <a href="contato.html" className="btn btn-primary btn-sm">
                Fale conosco <Arrow size={13} />
              </a>
              <button className="burger" aria-label="Menu" onClick={() => setMenuOpen(o => !o)}><span></span></button>
            </div>
          </nav>
        </div>
      </div>
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {NAV_LINKS.map(l => (
          <a key={l.href} href={l.href}>{l.label}</a>
        ))}
      </div>
    </>
  );
};

const Footer = () => (
  <footer>
    <div className="container">
      <div className="footer-grid">
        <div>
          <div className="logo">
            <span className="logo-mark"><LogoMark /></span>
            <span className="logo-text">EGD<span>.</span> CONSULTORIA</span>
          </div>
          <p className="footer-tagline">Engenharia de dados, sistemas e automação para empresas que decidem evoluir com método.</p>
          <div className="footer-status" style={{ marginTop: 18 }}>
            <span className="status"><span className="dot"></span>Sistemas operando</span>
          </div>
        </div>
        <div>
          <h4>Serviços</h4>
          <ul>
            <li><a href="servicos.html#dev">Desenvolvimento</a></li>
            <li><a href="servicos.html#auto">Automação</a></li>
            <li><a href="servicos.html#data">Data &amp; BI</a></li>
            <li><a href="servicos.html#ia">Agentes de IA</a></li>
            <li><a href="servicos.html#gov">Governança</a></li>
            <li><a href="servicos.html#agile">Projetos Ágeis</a></li>
          </ul>
        </div>
        <div>
          <h4>Empresa</h4>
          <ul>
            <li><a href="sobre.html">Sobre</a></li>
            <li><a href="produtos.html">Produtos</a></li>
            <li><a href="contato.html">Contato</a></li>
            <li><a href="contato.html#trabalhe">Carreiras</a></li>
          </ul>
        </div>
        <div>
          <h4>Contato</h4>
          <ul>
            <li><a href="mailto:contato@egdconsultoria.com.br">contato@egdconsultoria.com.br</a></li>
            <li><a href="#">+55 (11) 99999-0000</a></li>
            <li><a href="#">São Paulo · BR</a></li>
            <li><a href="#">LinkedIn ↗</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 EGD CONSULTORIA · v4.2.0 · BUILD 2026.05.08</span>
        <span>FEITO COM RIGOR — REMOTO / SP / BR</span>
      </div>
    </div>
  </footer>
);

/* Reveal observer hook */
const useReveal = () => {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

Object.assign(window, {
  Icon, LogoMark, Arrow, ArrowUR, Plus,
  Navbar, Footer, useReveal,
  NAV_LINKS
});
