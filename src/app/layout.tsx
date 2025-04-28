// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Discord Provider 임포트
import DiscordProvider from '@/components/providers/discord-provider';
import { JotaiProvider } from '@/components/providers/jotai-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Text Battle Game',
  description: 'A Discord-based text battle game with LLM decision making',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Jotai Provider로 상태 관리 */}
        <JotaiProvider>
          {/* Discord Provider */}
          <DiscordProvider>
            {children}
          </DiscordProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
