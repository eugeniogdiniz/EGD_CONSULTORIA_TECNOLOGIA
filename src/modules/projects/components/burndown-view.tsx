import type { Burndown } from "@/modules/projects/burndown";
import { formatHours } from "@/modules/projects/burndown";
import { formatBrShort } from "@/modules/reports/dates";

/** SVG puro do burndown: ideal (tracejado) e restante real (sólido) por semana. */
export function BurndownView({ b }: { b: Burndown }) {
  const W = 760;
  const H = 300;
  const m = { l: 56, r: 16, t: 16, b: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const n = b.points.length;
  const max = Math.max(b.totalMinutes, 60);
  const x = (i: number) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * iw);
  const y = (min: number) => m.t + ih - (min / max) * ih;
  const real = b.points.filter((p) => !Number.isNaN(p.remainingMinutes));
  const realPath = real.map((p, i) => `${i === 0 ? "M" : "L"}${x(b.points.indexOf(p)).toFixed(1)},${y(p.remainingMinutes).toFixed(1)}`).join(" ");
  const idealPath = b.points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.idealMinutes).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const labelEvery = Math.max(1, Math.ceil(n / 8));
  return (
    <figure className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="burndown-title burndown-desc" className="h-auto w-full min-w-[560px]">
        <title id="burndown-title">Burndown do projeto</title>
        <desc id="burndown-desc">
          Linha tracejada: queda ideal de {formatHours(b.totalMinutes)} até zero em {formatBrShort(b.to)}. Linha sólida: horas estimadas restantes por semana.
        </desc>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="var(--color-border)" strokeWidth={1} />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--color-muted-foreground)">{formatHours(t)}</text>
          </g>
        ))}
        {b.points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text key={p.weekStart} x={x(i)} y={H - 14} textAnchor="middle" fontSize={11} fill="var(--color-muted-foreground)">{formatBrShort(p.weekStart)}</text>
          ) : null,
        )}
        <path d={idealPath} fill="none" stroke="var(--color-faint)" strokeWidth={1.5} strokeDasharray="6 5" />
        {real.length > 0 && <path d={realPath} fill="none" stroke="var(--color-link)" strokeWidth={2.5} strokeLinejoin="round" />}
        {real.map((p) => (
          <circle key={p.weekStart} cx={x(b.points.indexOf(p))} cy={y(p.remainingMinutes)} r={3.5} fill="var(--color-link)" />
        ))}
      </svg>
      <figcaption className="type-micro mt-2 flex flex-wrap gap-4 text-muted-foreground">
        <span><span className="inline-block h-0.5 w-5 bg-link align-middle" /> restante (estimado e não concluído)</span>
        <span><span className="inline-block h-0.5 w-5 border-t border-dashed border-faint align-middle" /> ideal até {formatBrShort(b.to)}</span>
      </figcaption>
    </figure>
  );
}
