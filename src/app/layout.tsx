import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
