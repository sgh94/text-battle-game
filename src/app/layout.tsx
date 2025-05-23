// src/app/layout.tsx

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// Import Discord Provider
import DiscordProvider from '@/components/providers/discord-provider';
import { JotaiProvider } from '@/components/providers/jotai-provider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Text Battle Game',
  description: 'A Discord-based text battle game with LLM decision making',
};

// Separate viewport settings (recommended for Next.js 14+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Set default runtime for entire app (not edge)
export const runtime = 'nodejs';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to Discord CDN and API to improve loading performance */}
        <link rel="preconnect" href="https://cdn.discordapp.com" />
        <link rel="preconnect" href="https://discord.com" />
        <link rel="dns-prefetch" href="https://cdn.discordapp.com" />
        <link rel="dns-prefetch" href="https://discord.com" />
      </head>
      <body className={inter.className}>
        {/* Jotai Provider for state management */}
        <JotaiProvider>
          {/* Discord Provider */}
          <DiscordProvider>
            <main className="min-h-screen flex flex-col">
              {children}
            </main>
          </DiscordProvider>
        </JotaiProvider>
      </body>
    </html>
  );
}
