import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "GYM PRO", description: "Gym & personal training management" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg antialiased">{children}</body>
    </html>
  );
}
