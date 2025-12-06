import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShopFlows",
  description: "Vehicle tracking for auto shops",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
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
