import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import { appConfig } from "@/lib/config";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${appConfig.restaurantName} · Table ordering`,
    template: `%s · ${appConfig.restaurantName}`,
  },
  description: appConfig.tagline,
  icons: {
    icon: appConfig.logoSrc,
    apple: appConfig.logoSrc,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7ecd9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-IN"
      data-scroll-behavior="smooth"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-cream font-sans text-espresso" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-espresso focus:px-4 focus:py-2 focus:text-cream"
        >
          Skip to content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
