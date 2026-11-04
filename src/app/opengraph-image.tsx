import { ImageResponse } from "next/og";

export const alt = "Crypto Gems: discover, analyse and promote crypto projects";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "radial-gradient(70% 90% at 15% 0%, rgba(232,67,42,0.55), #08080a 62%)", color: "#f6f6f8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="84" height="84" viewBox="0 0 32 32"><path d="M9 4h14l6 8-13 16L3 12l6-8Z" fill="#ff5a3c" /></svg>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, letterSpacing: -2 }}><span>Crypto</span><span style={{ color: "#ff9a5c" }}>Gems</span></div>
        </div>
        <div style={{ marginTop: 36, fontSize: 56, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>Discover crypto momentum early.</div>
        <div style={{ marginTop: 20, fontSize: 28, color: "#8d8d98" }}>Live multi-chain discovery, token intelligence, listings and promotion.</div>
      </div>
    ),
    size,
  );
}
