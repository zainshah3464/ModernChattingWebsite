import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/lib/hooks/useAuth"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"], display: "swap" })

const title = "Zain Chat – Modern Real‑time Messaging"
const description =
  "Modern real‑time chat app built with Next.js"

export const metadata: Metadata = {
  title: {
    default: "Zain Chat",
    template: "%s | Zain Chat",
  },
  description,
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://zain-chat.vercel.app"),
  applicationName: "Zain Chat",
  creator: "Zain Shah",
  authors: [{ name: "Zain Shah", url: "https://zain-main-web.vercel.app" }],
  keywords: [
    "chat",
    "messaging",
    "real-time",
    "supabase",
    "nextjs",
    "zain",
    "modern",
    "cosmic",
  ],
  robots: "index, follow",

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://zain-chat.vercel.app",
    siteName: "Zain Chat",
    title,
    description,
    images: [
      {
        url: "/og-image.png?v=4", // cache-busting for WhatsApp
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Zain Chat – Modern Real‑time Chat",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    site: "@ZAIN_ALI_SHAH_",
    creator: "@ZAIN_ALI_SHAH_",
    title,
    description,
    images: ["/og-image.png?v=4"],
  },

  icons: {
    icon: "/favicon/favicon.ico",
    shortcut: "/favicon/favicon.ico",
    apple: "/favicon/apple-touch-icon.png",
    other: [
      { rel: "icon", type: "image/png", sizes: "192x192", url: "/favicon/icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", url: "/favicon/icon-512.png" },
      { rel: "mask-icon", url: "/favicon/safari-pinned-tab.svg", color: "#8b5cf6" },
    ],
  },

  manifest: "/favicon/manifest.json",

  other: {
    "theme-color": "#0a0818",
    "apple-mobile-web-app-title": "Zain Chat",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0818" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f5" },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://odtdyudkgkwcruoseujv.supabase.co" />
        <link rel="dns-prefetch" href="https://odtdyudkgkwcruoseujv.supabase.co" />
      </head>
      <body
        className={`${inter.className} bg-gray-950 text-white antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>{children}</AuthProvider>

        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  )
}
