import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealMapper — M&A Integration Engine",
  description: "AI-driven M&A post-close integration platform — 119-item checklist, 22 workstreams, Claude AI guidance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>{children}</body>
    </html>
  );
}
