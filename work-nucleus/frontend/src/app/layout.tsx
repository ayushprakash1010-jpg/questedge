import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "QuestEdge — AI-Powered Referral Hiring Marketplace",
    template: "%s | QuestEdge",
  },
  description:
    "QuestEdge connects high-growth companies with independent recruiters. Publish mandates with performance bounties, screen talent with Gemini AI, and secure candidate consent. Zero retainers.",
  keywords: [
    "referral hiring",
    "recruitment marketplace",
    "AI candidate screening",
    "talent bounty",
    "independent recruiters",
    "headhunter marketplace",
    "DPDP compliance hiring",
    "Gemini AI recruiting",
  ],
  authors: [{ name: "QuestEdge Technologies" }],
  creator: "QuestEdge",
  metadataBase: new URL(process.env.APP_BASE_URL || "https://questedge.in"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://questedge.in",
    title: "QuestEdge — AI-Powered Referral Hiring Marketplace",
    description:
      "Zero retainers. Trusted referrals. Pay bounties only on verified candidate tenure completion.",
    siteName: "QuestEdge",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "QuestEdge — AI-Powered Referral Hiring Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuestEdge — AI-Powered Referral Hiring Marketplace",
    description:
      "Zero retainers. Trusted referrals. Pay bounties only on verified candidate tenure completion.",
    images: ["/opengraph-image"],
    creator: "@questedge",
  },
  icons: {
    icon: [
      { url: "/icon.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/logo-icon.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico?v=3", sizes: "any" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: "/apple-touch-icon.png?v=3",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "QuestEdge",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F4D2A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <Auth0Provider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </Auth0Provider>
      </body>
    </html>
  );
}
