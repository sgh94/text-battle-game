'use client';

import { DiscordLoginButton } from '@/components/DiscordLoginButton';
import { CharactersList } from '@/components/CharactersList';
import { LeagueSelector } from '@/components/LeagueSelector';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { isConnected, isConnecting, user } = useDiscordAuth();
  const [loginChecked, setLoginChecked] = useState(false);

  // This ensures hydration issues are avoided
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Check if auth token exists and handle initial state
  useEffect(() => {
    const token = localStorage.getItem('discord_access_token');
    if (token && !isConnected && !isConnecting) {
      // We have a token but no user loaded yet - this is the transition state
      // that causes the login-not-logged-in flash effect
      setLoginChecked(false);
    } else {
      setLoginChecked(true);
    }
  }, [isConnected, isConnecting]);

  // Force router update if login state changes
  useEffect(() => {
    // User has been loaded - refresh UI
    if (user) {
      router.refresh();
    }
  }, [user, router]);

  // Render loading state during transition
  if (!isClient || !loginChecked) {
    return (
      <main className="flex min-h-screen flex-col items-center p-4 md:p-8 pb-20">
        <h1 className="text-3xl font-bold mb-8">Mitosis Text Hero Battle</h1>
        <div className="w-full max-w-2xl mb-6 flex justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-md bg-slate-700 h-10 w-32"></div>
          </div>
        </div>
        <div className="w-full max-w-2xl">
          <div className="animate-pulse flex flex-col space-y-4">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-4 bg-slate-700 rounded w-1/2"></div>
            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
          </div>
        </div>
      </main>
    );
  }

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
