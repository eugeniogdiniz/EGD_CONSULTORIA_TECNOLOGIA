import Link from "next/link";
import "@/styles/site-legacy.css";
import { Navbar } from "@/components/legacy/navbar";
import { Footer } from "@/components/legacy/footer";
import { Arrow } from "@/components/legacy/ui";

/** 404 global (rotas inexistentes), com o chrome do site. */
export default function NotFound() {
  return (
    <div className="site-root">
      <Navbar />
      <section className="page-head">
        <div className="grid-bg"></div>
        <div className="container">
          <div className="crumbs"><Link href="/">/</Link><span className="sep">→</span><span>404</span></div>
          <h1 style={{ marginTop: 24 }}>Página não encontrada.</h1>
          <p className="lead">Verifique o endereço ou volte ao início.</p>
          <div style={{ marginTop: 32 }}>
            <Link href="/" className="btn btn-primary">Ir para o início <Arrow /></Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
