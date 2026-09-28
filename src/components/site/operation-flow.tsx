"use client";

import { useState } from "react";

const steps = [
  { title: "Entender", subtitle: "Contexto antes do código", text: "Mapeamos a rotina, os gargalos e os critérios de sucesso com quem vive a operação." },
  { title: "Conectar", subtitle: "Uma arquitetura com propósito", text: "Integramos processos, fontes de dados e sistemas em uma solução que faz sentido para o seu time." },
  { title: "Entregar", subtitle: "Da validação à operação", text: "Validamos com os usuários, colocamos em produção e acompanhamos a evolução da solução." },
];

/** Movimento por interação, sem timers; respeita prefers-reduced-motion via CSS. */
export function OperationFlow() {
  const [active, setActive] = useState(0);
  return (
    <div className="operation-flow">
      <div className="operation-route" aria-hidden="true"><svg viewBox="0 0 480 140"><path className="route-base" d="M40 100H160V40H320V100H440" /><path key={active} className={`route-progress route-${active}`} d="M40 100H160V40H320V100H440" pathLength="1" /><circle cx="40" cy="100" r="8" /><circle cx="240" cy="40" r="8" /><circle cx="440" cy="100" r="8" /></svg></div>
      <div className="operation-tabs" role="tablist" aria-label="Etapas do projeto">
        {steps.map((step, i) => <button key={step.title} id={`step-${i}`} role="tab" aria-selected={active === i} aria-controls="operation-panel" tabIndex={active === i ? 0 : -1} onClick={() => setActive(i)} onKeyDown={(event) => { const next = event.key === "ArrowRight" ? (i + 1) % 3 : event.key === "ArrowLeft" ? (i + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : null; if (next !== null) { event.preventDefault(); setActive(next); document.getElementById(`step-${next}`)?.focus(); } }}><span>0{i + 1}</span>{step.title}</button>)}
      </div>
      <div id="operation-panel" role="tabpanel" aria-labelledby={`step-${active}`} tabIndex={0}><h3>{steps[active].subtitle}</h3><p>{steps[active].text}</p></div>
    </div>
  );
}
