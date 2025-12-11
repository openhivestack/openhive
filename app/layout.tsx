import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";
import { config } from "@/lib/config";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(config.appUrl),
  title: {
    default: config.appName,
    template: `%s | ${config.appName}`,
  },
  description: config.appDescription,
  keywords: [
    "AI Agents",
    "OpenHive",
    "Agent Marketplace",
    "Autonomous Agents",
    "AI Protocol",
    "Agent2Agent",
    "A2A",
  ],
  authors: [
    {
      name: config.appAuthor,
      url: config.appAuthorUrl,
    },
  ],
  creator: config.appAuthor,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: config.appUrl,
    title: config.appName,
    description: config.appDescription,
    siteName: config.appName,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: config.appName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: config.appName,
    description: config.appDescription,
    images: ["/logo.png"],
    creator: "@openhive",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.appName,
    url: config.appUrl,
    logo: `${config.appUrl}/logo.png`,
    sameAs: [
      config.appAuthorTwitter,
      config.appAuthorGitHub,
      config.appAuthorLinkedIn,
    ],
    description: config.appDescription,
  };

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body
        suppressHydrationWarning={true}
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
