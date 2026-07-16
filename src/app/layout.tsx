import type { Metadata } from "next";
import { Archivo, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const adminDisplay = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-admin-display",
  display: "swap",
});

const adminBody = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
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
