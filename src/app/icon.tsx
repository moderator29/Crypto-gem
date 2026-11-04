import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(80% 80% at 30% 20%, #3a1209, #08080a 70%)" }}>
        <svg width="300" height="300" viewBox="0 0 32 32"><path d="M9 4h14l6 8-13 16L3 12l6-8Z" fill="#ff5a3c" /><path d="M9 4l7 8 7-8M3 12h26M16 12v16" stroke="#ffd2c4" strokeWidth="1.2" fill="none" strokeLinejoin="round" /></svg>
      </div>
    ),
    size,
  );
}
