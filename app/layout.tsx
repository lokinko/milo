import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Milo · 循日健康规划",
  description: "把健康照顾，放进每一天。个人饮食、康复与随访规划。",
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg`,
    shortcut: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
