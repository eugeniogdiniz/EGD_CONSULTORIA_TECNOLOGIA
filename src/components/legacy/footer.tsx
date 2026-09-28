import Link from "next/link";
import { LogoMark } from "./ui";
import { SITE } from "@/content/site";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="logo">
              <span className="logo-mark">
                <LogoMark />
              </span>
              <span className="logo-text">
                EGD<span>.</span> CONSULTORIA
              </span>
            </div>
            <p className="footer-tagline">Engenharia de dados, sistemas e automação para empresas que decidem evoluir com método.</p>
            <div className="footer-status" style={{ marginTop: 18 }}>
              <span className="status">
                <span className="dot"></span>Sistemas operando
              </span>
            </div>
          </div>
          <div>
            <h4>Serviços</h4>
            <ul>
              <li><Link href="/servicos#dev">Desenvolvimento</Link></li>
              <li><Link href="/servicos#auto">Automação</Link></li>
              <li><Link href="/servicos#data">Data &amp; BI</Link></li>
              <li><Link href="/servicos#ia">Agentes de IA</Link></li>
              <li><Link href="/servicos#gov">Governança</Link></li>
              <li><Link href="/servicos#agile">Projetos Ágeis</Link></li>
            </ul>
          </div>
          <div>
            <h4>Empresa</h4>
            <ul>
              <li><Link href="/sobre">Sobre</Link></li>
              <li><Link href="/produtos">Produtos</Link></li>
              <li><Link href="/cases">Cases</Link></li>
              <li><Link href="/contato">Contato</Link></li>
              <li><Link href="/entrar">Portal do cliente</Link></li>
            </ul>
          </div>
          <div>
            <h4>Contato</h4>
            <ul>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><span style={{ color: "var(--fg-dim)", fontSize: 14 }}>São Paulo · BR</span></li>
              <li><a href="#">LinkedIn ↗</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} EGD CONSULTORIA · v5.0.0</span>
          <span>FEITO COM RIGOR — REMOTO / SP / BR</span>
        </div>
      </div>
    </footer>
  );
}
