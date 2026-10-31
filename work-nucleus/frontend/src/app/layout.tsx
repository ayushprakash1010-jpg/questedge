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
  metadataBase: new URL(process.env.APP_BASE_URL || "https://questedge.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://questedge.vercel.app",
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
    icon: "/favicon.ico",
    apple: "/icon-192.png",
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
  themeColor: "#4f46e5",
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
