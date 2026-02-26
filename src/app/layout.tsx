import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@excalidraw/excalidraw/index.css';

export const metadata: Metadata = {
  title: 'AI Excalidraw - 手绘风格绘图工具',
  description: '通过 AI 对话生成 Excalidraw 手绘风格图形',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon.ico' }],
    apple: [{ url: '/favicon.ico' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
