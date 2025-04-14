// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// 지갑 Provider 임포트
import WalletProvider from '@/components/providers/wallet-provider';
import { JotaiProvider } from '@/components/providers/jotai-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Text Battle Game',
  description: 'A web3-based text battle game with LLM decision making',
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
          {/* 지갑 Provider */}
          <WalletProvider>
            {children}
          </WalletProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}