/* Ícones compartilhados; símbolo único para site e portais. */
import { BrandMark } from "@/components/site/brand-mark";

export const Icon = ({ d, stroke = "currentColor", fill = "none", size = 20, vb = 24, className }: { d: string; stroke?: string; fill?: string; size?: number; vb?: number; className?: string }) => (
  <svg viewBox={`0 0 ${vb} ${vb}`} width={size} height={size} fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

export const LogoMark = BrandMark;

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
