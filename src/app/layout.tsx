import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopFlows",
  description: "Vehicle tracking for auto shops",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ShopFlows",
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        style={{
          minHeight: "100vh",
          backgroundColor: "#0a0a0a",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            margin: "0 auto",
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            padding: "1.5rem 1rem",
          }}
        >
          {children}
        </div>
      </body>
    </html>
  );
}
