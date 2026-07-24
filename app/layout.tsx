import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "MatchPoint — parceiros de tênis na sua cidade",
  description:
    "O app que conecta tenistas na mesma cidade. Viajou e não tem com quem jogar? Dê match e vá para a quadra.",
  applicationName: "MatchPoint",
  authors: [{ name: "MatchPoint" }],
  keywords: ["tênis", "tennis", "parceiro de tênis", "quadra", "jogar tênis", "match"],
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
