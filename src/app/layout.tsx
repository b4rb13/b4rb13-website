import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";

import "./globals.css";
import { generateMetadata, generateStructuredData } from "@/lib/constants/seo";

// Terminal-appropriate monospace font
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Comprehensive SEO metadata
export const metadata: Metadata = generateMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Structured data for SEO
  const structuredData = generateStructuredData();

  return (
    <html lang="en" className="dark">
      <head>
        {/* Structured Data */}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Required for JSON-LD structured data
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} font-mono antialiased bg-black text-green-400 overflow-hidden`}
      >
        {/* p5.js for mirror command */}
        <Script
          src="https://cdn.jsdelivr.net/npm/p5@2.0.5/lib/p5.js"
          strategy="lazyOnload"
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
