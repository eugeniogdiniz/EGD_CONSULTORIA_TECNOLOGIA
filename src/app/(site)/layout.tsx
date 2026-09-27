import "@/styles/site-legacy.css";
import { Navbar } from "@/components/legacy/navbar";
import { Footer } from "@/components/legacy/footer";
import { RevealObserver } from "@/components/legacy/reveal";

/** Site público com a identidade original (dark tech). O CSS é escopado sob .site-root. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="site-root">
      <Navbar />
      {children}
      <Footer />
      <RevealObserver />
    </div>
  );
}
