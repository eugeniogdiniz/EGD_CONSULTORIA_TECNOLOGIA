/* Chrome compartilhado do site original: ícones e marca (portado de legacy/assets/shared.jsx). */

export const Icon = ({ d, stroke = "currentColor", fill = "none", size = 20, vb = 24, className }: { d: string; stroke?: string; fill?: string; size?: number; vb?: number; className?: string }) => (
  <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

export const LogoMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5 H16" stroke="var(--accent)" />
    <path d="M5 12 H13" />
    <path d="M5 19 H16" stroke="var(--accent)" />
    <path d="M19 5 L19 19" stroke="var(--accent)" />
  </svg>
);

export const Arrow = ({ size = 14, className = "arr" }: { size?: number; className?: string }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const ArrowUR = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const Plus = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
