import Link from "next/link";
import { LogoMark } from "./ui";
import { SHOW_CASES, SITE } from "@/content/site";
import { BrandWordmark } from "@/components/site/brand-mark";

export function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="logo" role="img" aria-label="EGD Consultoria em Tecnologia">
              <span className="logo-mark">
                <LogoMark />
              </span>
              <span className="logo-text">
                <BrandWordmark className="brand-wordmark" />
              </span>
            </div>
            <p className="footer-tagline">Tecnologia que transforma. Soluções que geram valor. Dados, sistemas e inteligência trabalhando na mesma direção.</p>

          </div>
          <div>
            <h4 aria-level={2}>Serviços</h4>
            <ul>
              <li><Link href="/servicos/dev">Desenvolvimento</Link></li>
              <li><Link href="/servicos/auto">Automação</Link></li>
              <li><Link href="/servicos/data">Data &amp; BI</Link></li>
              <li><Link href="/servicos/ia">Agentes de IA</Link></li>
              <li><Link href="/servicos/gov">Governança</Link></li>
              <li><Link href="/servicos/agile">Projetos Ágeis</Link></li>
            </ul>
          </div>
          <div>
            <h4 aria-level={2}>Empresa</h4>
            <ul>
              <li><Link href="/sobre">Sobre</Link></li>
              <li><Link href="/produtos">Produtos</Link></li>
              <li><Link href="/consorcios">Para consórcios</Link></li>
              <li><Link href="/artigos">Artigos</Link></li>
              {SHOW_CASES && <li><Link href="/cases">Cases</Link></li>}
              <li><Link href="/contato">Contato</Link></li>
              <li><Link href="/entrar">Portal do cliente</Link></li>
            </ul>
          </div>
          <div>
            <h4 aria-level={2}>Contato</h4>
            <ul>
              <li><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
              <li><span style={{ color: "var(--fg-dim)", fontSize: 14 }}>São Paulo · BR</span></li>
              <li><a href="/brand/manual-da-marca.pdf">Manual da marca</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} EGD Consultoria em Tecnologia</span>
          <span>Do projeto à operação.</span>
        </div>
      </div>
    </footer>
  );
}
