import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted: next/font/google flakes on Vercel when Google returns extensionless
// /l/font?kit=… URLs (null ext parse → TypeError). See vercel/next.js#99114.
const adminDisplay = localFont({
  src: [
    { path: "./fonts/archivo-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/archivo-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/archivo-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-admin-display",
  display: "swap",
});

const adminBody = localFont({
  src: [
    { path: "./fonts/source-sans-3-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-sans-3-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/source-sans-3-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-admin-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Montreal Living — Rental application",
  description: "Apply for an apartment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`min-h-screen ${adminDisplay.variable} ${adminBody.variable}`}>
        {children}
      </body>
    </html>
  );
}
