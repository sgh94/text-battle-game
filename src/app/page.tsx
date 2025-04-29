'use client';

import { DiscordLoginButton } from '@/components/DiscordLoginButton';
import { CharactersList } from '@/components/CharactersList';
import { LeagueSelector } from '@/components/LeagueSelector';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  const { isConnected } = useDiscordAuth();

  // This ensures hydration issues are avoided
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 pb-20">
      <h1 className="text-3xl font-bold mb-8">Mitosis Text Hero Battle</h1>

      <div className="w-full max-w-2xl mb-6">
        <div className="flex justify-between items-center">
          {isClient && <DiscordLoginButton />}
          <Link href="/ranking" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
            Leaderboard &rarr;
          </Link>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <CharactersList />
        
        {isConnected && <LeagueSelector />}
        
        {!isConnected && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Connect to Play</h2>
            <p className="text-gray-400 mb-4">
              Summon your heroes and enter the arena. Compete across leagues by connecting with Discord.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
