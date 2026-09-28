/* Diagramas SVG animados do original (mini no hero e arquitetura completa). */

export function DiagMini() {
  const lines: [number, number, number, number][] = [
    [60, 60, 200, 60],
    [200, 60, 300, 60],
    [300, 60, 420, 60],
    [420, 60, 500, 60],
  ];
  const nodes = [
    { x: 60, label: "INGEST", sub: "Kafka" },
    { x: 200, label: "LAKE", sub: "S3 / ADLS" },
    { x: 300, label: "TRANSF", sub: "Spark" },
    { x: 420, label: "BI", sub: "Power BI" },
    { x: 500, label: "AGENT", sub: "LLM" },
  ];
  return (
    <svg viewBox="0 0 520 120" width="100%" height="120" style={{ display: "block" }}>
      <defs>
        <linearGradient id="line-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="50%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
        </linearGradient>
      </defs>
      {lines.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 4" />
      ))}
      {lines.map(([x1, y1, x2, y2], i) => (
        <circle key={"d" + i} r="3" fill="var(--accent)">
          <animateMotion dur={`${2.4 + i * 0.3}s`} repeatCount="indefinite" path={`M ${x1} ${y1} L ${x2} ${y2}`} begin={`${i * 0.4}s`} />
        </circle>
      ))}
      {nodes.map((n, i) => (
        <g key={i} transform={`translate(${n.x} 60)`}>
          <circle r="22" fill="#0f1219" stroke="var(--line-2)" />
          <circle r="22" fill="none" stroke="var(--accent)" strokeOpacity="0.4">
            <animate attributeName="r" values="22;28;22" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="0.4;0;0.4" dur="3s" begin={`${i * 0.5}s`} repeatCount="indefinite" />
          </circle>
          <text x="0" y="-28" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--fg-mute)" letterSpacing="0.1em">{n.label}</text>
          <text x="0" y="42" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--fg-dim)">{n.sub}</text>
        </g>
      ))}
    </svg>
  );
}

export function ArchDiagram() {
  const cols = [
    { x: 80, label: "FONTES", items: [{ n: "ERPs", y: 60 }, { n: "CRMs", y: 120 }, { n: "APIs", y: 180 }, { n: "IoT", y: 240 }] },
    { x: 280, label: "INGESTÃO", items: [{ n: "Kafka", y: 90, t: "stream" }, { n: "Airflow", y: 170, t: "batch" }, { n: "Lambda", y: 240, t: "event" }] },
    { x: 470, label: "STORAGE", items: [{ n: "S3 · ADLS", y: 90, t: "raw" }, { n: "Iceberg", y: 160, t: "lake" }, { n: "Redshift · Synapse", y: 240, t: "warehouse" }] },
    { x: 700, label: "PROCESSAMENTO", items: [{ n: "Apache Spark", y: 90, t: "transform" }, { n: "dbt", y: 160, t: "models" }, { n: "Glue · ADF", y: 240, t: "orchestrate" }] },
    { x: 920, label: "CONSUMO", items: [{ n: "Power BI", y: 90, t: "BI" }, { n: "Agentes IA", y: 160, t: "copilot" }, { n: "APIs · Apps", y: 240, t: "product" }] },
  ] as { x: number; label: string; items: { n: string; y: number; t?: string }[] }[];
  const links: { x1: number; y1: number; x2: number; y2: number }[] = [];
  cols.slice(0, -1).forEach((col, ci) => {
    const next = cols[ci + 1];
    col.items.forEach((a) =>
      next.items.forEach((b) => {
        links.push({ x1: col.x + 80, y1: a.y + 14, x2: next.x, y2: b.y + 14 });
      }),
    );
  });
  const pulses = ["M 360 104 L 470 104", "M 550 104 L 700 104", "M 780 104 L 920 104", "M 360 184 L 470 174", "M 550 174 L 700 174", "M 780 174 L 920 174"];

  return (
    <svg viewBox="0 0 1080 320" width="100%" style={{ display: "block" }}>
      <defs>
        <linearGradient id="arch-line" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.12)" />
        </linearGradient>
      </defs>
      {links.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="url(#arch-line)" strokeWidth="1" />
      ))}
      {pulses.map((p, i) => (
        <circle key={"p" + i} r="2.5" fill="var(--accent)">
          <animateMotion dur="3s" begin={`${i * 0.4}s`} repeatCount="indefinite" path={p} />
        </circle>
      ))}
      {cols.map((c) => (
        <text key={c.label} x={c.x + 40} y={28} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" letterSpacing="0.16em" fill="var(--fg-mute)">{c.label}</text>
      ))}
      {cols.map((col) =>
        col.items.map((n, j) => (
          <g key={col.label + j} transform={`translate(${col.x} ${n.y})`}>
            <rect width="80" height="28" rx="6" fill="#0f1219" stroke="var(--line-2)" />
            <text x="40" y="18" textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--fg)">{n.n}</text>
            {n.t && <text x="40" y="42" textAnchor="middle" fontFamily="var(--mono)" fontSize="9" fill="var(--fg-faint)">{n.t}</text>}
          </g>
        )),
      )}
    </svg>
  );
}
