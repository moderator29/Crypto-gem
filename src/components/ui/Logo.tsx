export function GemMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gm-a" x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4d8dff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="gm-b" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M9 4h14l6 8-13 16L3 12l6-8Z" fill="url(#gm-a)" />
      <path d="M9 4l7 8 7-8M3 12h26M16 12v16" stroke="url(#gm-b)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <GemMark />
      <span className="font-display text-[17px] font-bold tracking-tight">
        Crypto<span className="text-brand">Gems</span>
      </span>
    </span>
  );
}
