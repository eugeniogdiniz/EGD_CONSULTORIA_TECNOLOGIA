"use client";

import { useEffect, useState } from "react";

/** Ticker vivo do hero (portado do original). */
export function Ticker() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1200);
    return () => clearInterval(i);
  }, []);
  const events = (12400 + ((t * 137) % 2400)).toLocaleString("pt-BR");
  const lat = 78 + ((t * 11) % 18);
  const dags = 14;
  const ok = (99.94 + ((t * 7) % 6) / 100).toFixed(2);
  return (
    <div className="ticker">
      <div className="tick"><span className="k">events/s</span><span className="v">{events}</span></div>
      <div className="tick"><span className="k">p99 lat</span><span className="v">{lat}<i>ms</i></span></div>
      <div className="tick"><span className="k">DAGs vivas</span><span className="v">{dags}</span></div>
      <div className="tick"><span className="k">SLA 30d</span><span className="v">{ok}<i>%</i></span></div>
    </div>
  );
}
