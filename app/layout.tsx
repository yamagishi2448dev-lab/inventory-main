import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventory - 在庫管理システム",
  description: "シンプルで使いやすい在庫管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
