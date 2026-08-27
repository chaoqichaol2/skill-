import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skill Scout｜私人评测后台",
  description: "Skill 候选收集、评测与推荐管理后台。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
