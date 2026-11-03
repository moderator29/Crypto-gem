/* eslint-disable @next/next/no-img-element */
/** Real logo when a provider supplied one, otherwise a neutral monogram. Never an invented logo. */
export function TokenLogo({ src, symbol, size = 40 }: { src: string | null | undefined; symbol: string; size?: number }) {
  const style = { width: size, height: size };
  if (src) {
    return <img src={src} alt="" width={size} height={size} loading="lazy" referrerPolicy="no-referrer" style={style} className="shrink-0 rounded-full bg-[var(--border)] object-cover" />;
  }
  return (
    <span style={{ ...style, fontSize: size * 0.38 }} className="grid shrink-0 place-items-center rounded-full bg-[var(--border-strong)] font-bold text-soft" aria-hidden="true">
      {symbol.slice(0, 2).toUpperCase()}
    </span>
  );
}
