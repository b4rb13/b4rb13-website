import type { Metadata } from "next";

// SEO constants and configuration
export const SEO_CONFIG = {
  title: "b4rb13",
  description:
    "Lead Frontend Engineer specialized in React, Next.js, and TypeScript. Building scalable systems and leading teams in modern web development.",
  author: "Derenik Khachatryan",
  keywords: [
    "Frontend Engineer",
    "React Developer",
    "Next.js Expert",
    "TypeScript",
    "Lead Engineer",
    "Web Development",
    "JavaScript",
    "UI/UX",
    "Team Leadership",
    "Architecture",
  ],
  url: "https://b4rb13.info",
  siteName: "b4rb13",
  locale: "en_US",
  type: "website",

  // Social
  twitter: {
    handle: "@__b4rb13",
    site: "@__b4rb13",
  },

  // Images
  images: {
    social: "/images/social.jpg",
    logo192: "/images/logo192.png",
    logo512: "/images/logo512.png",
    favicon: "/favicon.ico",
  },

  // Theme
  themeColor: "#000000",
  backgroundColor: "#20c20e",
};

// Generate comprehensive metadata for Next.js
export const generateMetadata = (): Metadata => ({
  title: {
    default: SEO_CONFIG.title,
    template: `%s | ${SEO_CONFIG.title}`,
  },
  description: SEO_CONFIG.description,
  keywords: SEO_CONFIG.keywords,
  authors: [{ name: SEO_CONFIG.author }],
  creator: SEO_CONFIG.author,
  publisher: SEO_CONFIG.author,

  // Basic meta tags
  metadataBase: new URL(SEO_CONFIG.url),
  alternates: {
    canonical: "/",
  },

  // Open Graph
  openGraph: {
    type: "website",
    locale: SEO_CONFIG.locale,
    url: SEO_CONFIG.url,
    title: SEO_CONFIG.title,
    description: SEO_CONFIG.description,
    siteName: SEO_CONFIG.siteName,
    images: [
      {
        url: SEO_CONFIG.images.social,
        width: 1200,
        height: 630,
        alt: `${SEO_CONFIG.title} - ${SEO_CONFIG.description}`,
        type: "image/jpeg",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: SEO_CONFIG.twitter.site,
    creator: SEO_CONFIG.twitter.handle,
    title: SEO_CONFIG.title,
    description: SEO_CONFIG.description,
    images: [SEO_CONFIG.images.social],
  },

  // Icons and theme
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/images/logo192.png", type: "image/png", sizes: "192x192" },
      { url: "/images/logo512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/images/logo192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },

  // PWA and theme
  manifest: "/manifest.json",

  // Additional meta tags
  other: {
    "theme-color": SEO_CONFIG.themeColor,
    "color-scheme": "dark",
    "format-detection": "telephone=no",
  },

  // Robots and indexing
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

  // Verification (add when available)
  verification: {
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
  },
});

// Structured Data for SEO
export const generateStructuredData = () => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name: SEO_CONFIG.author,
  url: SEO_CONFIG.url,
  image: `${SEO_CONFIG.url}${SEO_CONFIG.images.social}`,
  sameAs: [
    "https://github.com/b4rb13",
    "https://linkedin.com/in/derenik-khachatryan/",
    "https://twitter.com/__b4rb13",
    "https://t.me/derkhachatryan",
  ],
  jobTitle: "Lead Frontend Engineer",
  worksFor: {
    "@type": "Organization",
    name: "Independent",
  },
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "Frontend Architecture",
    "Team Leadership",
    "Web Development",
  ],
  description: SEO_CONFIG.description,
});
