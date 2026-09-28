import "@/styles/site-legacy.css";
import "@/styles/brand.css";
import { Navbar } from "@/components/legacy/navbar";
import { Footer } from "@/components/legacy/footer";

/** Identidade EGD compartilhada em todas as páginas públicas. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="site-root">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <Navbar />
      <main id="conteudo">{children}</main>
      <Footer />
    </div>
  );
}
