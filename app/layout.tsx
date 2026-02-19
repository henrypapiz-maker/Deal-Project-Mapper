import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M&A Integration Engine",
  description: "AI-driven M&A post-close integration platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
