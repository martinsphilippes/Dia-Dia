import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PWA } from "@/components/pwa";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MatchPoint — parceiros de tênis na sua cidade",
  description:
    "O app que conecta tenistas na mesma cidade. Viajou e não tem com quem jogar? Dê match e vá para a quadra.",
  applicationName: "MatchPoint",
  authors: [{ name: "MatchPoint" }],
  keywords: ["tênis", "tennis", "parceiro de tênis", "quadra", "jogar tênis", "match"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MatchPoint",
  },
  icons: {
    icon: [
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "MatchPoint — parceiros de tênis na sua cidade",
    description:
      "Encontre alguém do seu nível para jogar tênis, na sua cidade ou onde você estiver viajando.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#104b32",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>
        {children}
        <PWA />
      </body>
    </html>
  );
}
