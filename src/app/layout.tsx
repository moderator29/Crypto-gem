import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { I18nProvider } from "@/components/i18n/I18nProvider";
import { Footer } from "@/components/layout/Footer";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { dirOf } from "@/lib/i18n/config";
import { messagesFor } from "@/lib/i18n/messages";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";
import "@/styles/fx.css";
import "@/styles/pages.css";
import "@/styles/markets.css";
import { RouteProgress } from "@/components/fx/RouteProgress";
import { BackToTop } from "@/components/fx/BackToTop";
import { KeyboardShortcuts } from "@/components/fx/KeyboardShortcuts";
import { WelcomeTour } from "@/components/fx/WelcomeTour";
import { SoundTaps } from "@/components/fx/SoundTaps";

export const metadata: Metadata = {
  title: { default: "Crypto Gems | Discover, analyse and promote crypto projects", template: "%s | Crypto Gems" },
  description: "Multi-chain token discovery, market intelligence, listings and promotion.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#040612",
  colorScheme: "dark",
};

const themeScript = `try{var t=localStorage.getItem('cg-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={dirOf(locale)} data-theme="dark" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <I18nProvider locale={locale} messages={messagesFor(locale)}>
          <AuthProvider>
            <ToastProvider>
              <RouteProgress />
              <SoundTaps />
              <KeyboardShortcuts />
              <BackToTop />
              <WelcomeTour />
              <SiteChrome footer={<Footer />}>{children}</SiteChrome>
            </ToastProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
