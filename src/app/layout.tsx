// src/app/layout.tsx

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// 생성할 클라이언트 Provider 컴포넌트 임포트 (경로는 실제 생성 위치에 맞게 조정)
import WalletProvider from '@/background/wallet-provider';

const inter = Inter({ subsets: ['latin'] });

// metadata는 서버 컴포넌트에 그대로 유지
export const metadata: Metadata = {
  title: 'Text Battle Game',
  description: 'A web3-based text battle game with LLM decision making',
};

// RootLayout은 이제 서버 컴포넌트
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 클라이언트 측 Provider 로직은 WalletProvider 컴포넌트에 위임 */}
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}