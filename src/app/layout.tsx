import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KamiVoca - Japanese Mastery",
  description: "DuoLingo-style Japanese vocabulary learning for Korean speakers",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { GamificationProvider } from "@/contexts/GamificationContext";
import AudioPrewarmer from "@/components/AudioPrewarmer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <GamificationProvider>
          <AudioPrewarmer />
          {children}
        </GamificationProvider>
      </body>
    </html>
  );
}
