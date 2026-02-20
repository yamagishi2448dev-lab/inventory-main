import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SWRProvider } from "@/lib/hooks/swr-config";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "在庫管理システム",
  description: "シンプルで使いやすい在庫管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <SWRProvider>{children}</SWRProvider>
      </body>
    </html>
  );
}
