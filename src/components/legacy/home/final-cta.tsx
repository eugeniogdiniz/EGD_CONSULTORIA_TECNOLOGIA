"use client";

import { useState } from "react";
import Link from "next/link";
import { Arrow, ArrowUR } from "../ui";
import { SITE } from "@/content/site";

export function FinalCTA() {
  const [copied, setCopied] = useState(false);
  const email = SITE.email;
  const copy = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigator.clipboard?.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <section className="cta-final" id="contato-cta">
      <div className="container">
        <div className="cta-card reveal">
          <span className="eyebrow">CONTATO / VAMOS COMEÇAR</span>
          <h2 style={{ marginTop: 22 }}>
            Pronto para destravar dados,<br />processos e produtos?
          </h2>
          <p style={{ marginTop: 22, fontSize: 17, maxWidth: 620 }}>
            Conte o seu desafio. Em até 48h respondemos com um diagnóstico inicial e os próximos passos.
          </p>
          <div className="cta-actions">
            <Link href="/contato" className="btn btn-primary">Agendar conversa <Arrow /></Link>
            <a href={`mailto:${email}`} onClick={copy} className="cta-mail" title="Clique para copiar">
              {copied ? <span className="copied">e-mail copiado ✓</span> : <>{email}</>}
              {!copied && <ArrowUR size={12} />}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
