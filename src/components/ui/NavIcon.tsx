import type { ReactNode } from "react";

/** One flat line icon family. Strokes follow the text colour, the accent part follows the brand colour. */
const ART: Record<string, ReactNode> = {
  home: (<><path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z" /><path className="acc" d="M9 20v-6h6v6" /></>),
  markets: (<><rect x="3.5" y="12" width="3.6" height="8" rx="1" /><rect x="10.2" y="7.5" width="3.6" height="12.5" rx="1" /><rect className="acc" x="16.9" y="3.5" width="3.6" height="16.5" rx="1" /></>),
  copilot: (<><path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-8.5L6 20.5v-4H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z" /><path className="acc" d="M12 7.5l1.1 2.6 2.6 1.1-2.6 1.1L12 14.9l-1.1-2.6-2.6-1.1 2.6-1.1L12 7.5z" /></>),
  pulse: (<><path d="M3 12h4l2-5 4 11 2.5-6H21" /><path className="acc" d="M9 7l4 11" /></>),
  boost: (<><path d="M12 3c3.2 2 5 5 5 8.5l-2 3.5H9l-2-3.5C7 8 8.8 5 12 3z" /><circle className="acc" cx="12" cy="9.5" r="1.7" /><path d="M9 15l-2.5 3.500M15 15l2.5 3.500M12 17v4" /></>),
  promo: (<><path d="M4 10v4h3l8 4.500V5.500L7 10H4z" /><path className="acc" d="M18.5 9a4.5 4.5 0 0 1 0 6" /><path d="M7 14l1 5h2.500l-.8-4" /></>),
  fresh: (<><circle cx="12" cy="12" r="8.5" /><path className="acc" d="M12 7.500V12l3 2" /></>),
  heating: (<><path d="M12 3c.8 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.3 2-4.2.2 1.8 1 2.7 2 3 .5-3-.8-5.3 1-8.800z" /><path className="acc" d="M12 20a2.2 2.2 0 0 0 2.2-2.200c0-1.3-1.2-2-2.2-3.3-1 1.3-2.2 2-2.2 3.300A2.2 2.2 0 0 0 12 20z" /></>),
  map: (<><rect x="3.5" y="3.5" width="9" height="9" rx="1.5" /><rect x="14.5" y="3.5" width="6" height="5" rx="1.5" /><rect className="acc" x="14.5" y="10.5" width="6" height="10" rx="1.5" /><rect x="3.5" y="14.5" width="9" height="6" rx="1.5" /></>),
  chains: (<><circle cx="7" cy="12" r="3.5" /><circle className="acc" cx="17" cy="12" r="3.5" /><path d="M10.5 12h3" /></>),
  star: (<><path d="M12 3.500l2.6 5.3 5.9.9-4.3 4.1 1 5.800L12 16.8 6.8 19.600l1-5.800L3.5 9.700l5.9-.9L12 3.500z" /><circle className="acc" cx="12" cy="12" r="1.2" /></>),
  dashboard: (<><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><path d="M3.5 9h17" /><path className="acc" d="M9 9v11.5" /></>),
  settings: (<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle className="acc" cx="15" cy="7" r="2" /><circle className="acc" cx="9" cy="17" r="2" /></>),
  add: (<><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path className="acc" d="M12 8v8M8 12h8" /></>),
  bell: (<><path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.5 1.500h-15L6 16.500z" /><path className="acc" d="M10 20.500a2.2 2.2 0 0 0 4 0" /></>),
  inbox: (<><path d="M3.5 13l2.5-8h12l2.5 8v5.500a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V13z" /><path className="acc" d="M3.5 13h5l1.5 2.500h4l1.5-2.500h5" /></>),
  compare: (<><path d="M4 18l5-7 4 4 7-9" /><path className="acc" d="M4 9l5 3 4-6 7 8" /></>),
  status: (<><circle cx="12" cy="12" r="8.5" /><path className="acc" d="M8 12.500l2.8 2.800L16 9.5" /></>),
  shield: (<><path d="M12 3l7.5 3v5.500c0 4.5-3 7.8-7.5 9.5-4.5-1.7-7.5-5-7.5-9.500V6L12 3z" /><path className="acc" d="M8.8 12l2.2 2.2 4.2-4.4" /></>),
  tools: (<><path d="M14.500 5.500a4 4 0 0 0-5 5L4 16l4 4 5.500-5.500a4 4 0 0 0 5-5l-2.500 2.500-2.500-.5-.5-2.500 2.500-2.500z" /><circle className="acc" cx="7" cy="17" r="1" /></>),
  learn: (<><path d="M3 8l9-4 9 4-9 4-9-4z" /><path className="acc" d="M7 10.500V15c0 1.500 2.200 3 5 3s5-1.500 5-3v-4.500" /></>),
  help: (<><circle cx="12" cy="12" r="8.500" /><path className="acc" d="M9.500 9.500a2.500 2.500 0 1 1 3.500 2.300c-.7.400-1 .900-1 1.700" /><circle className="acc" cx="12" cy="16.500" r=".6" /></>),
  log: (<><rect x="4" y="3.500" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8" /><path className="acc" d="M8 16h4" /></>),
  sound: (<><path d="M4 10v4h3l5 4V6L7 10H4z" /><path className="acc" d="M16 9a4 4 0 0 1 0 6M18.500 6.500a8 8 0 0 1 0 11" /></>),
  mute: (<><path d="M4 10v4h3l5 4V6L7 10H4z" /><path className="acc" d="M16 9.500l5 5M21 9.500l-5 5" /></>),
  alert: (<><path d="M6 16.500V11a6 6 0 0 1 12 0v5.500l1.5 1.500h-15L6 16.500z" /><path className="acc" d="M12 8.500v3.500l2 1" /></>),
};

export type NavIconName = keyof typeof ART;

export function NavIcon({ name, size = 22, className = "" }: { name: NavIconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`nav-icon ${className}`}>
      {ART[name]}
    </svg>
  );
}
