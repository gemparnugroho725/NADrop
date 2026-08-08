import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientLayout } from "@/components/layout/ClientLayout";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SwipePredict - Prediction Markets as Fast as Swiping",
  description:
    "Predict yes/no outcomes for short events, stake tokens, and get instant on-chain settlement through Monad testnet and x402 protocol.",
  keywords: ["prediction market", "monad", "x402", "web3", "swipe"],
  openGraph: {
    title: "SwipePredict",
    description:
      "Prediction markets as fast as swiping, with instant on-chain settlement.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-[var(--color-base)] text-[var(--color-ink)] antialiased"
        suppressHydrationWarning
      >
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
