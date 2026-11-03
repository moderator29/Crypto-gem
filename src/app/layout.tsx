import type { Metadata, Viewport } from "next";
import { SiteChrome } from "@/components/layout/SiteChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Crypto Gems | Discover, analyse and promote crypto projects", template: "%s | Crypto Gems" },
  description: "Multi-chain token discovery, market intelligence, listings and promotion.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060913" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
  ],
};

const themeScript = `try{var t=localStorage.getItem('cg-theme');if(!t){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','dark')}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
