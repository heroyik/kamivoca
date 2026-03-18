import type { Metadata, Viewport } from "next";
import "./globals.css";

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
import OfflineModeGate from "@/components/OfflineModeGate";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <GamificationProvider>
          <ServiceWorkerRegistrar />
          <AudioPrewarmer />
          <OfflineModeGate />
          {children}
        </GamificationProvider>
      </body>
    </html>
  );
}
