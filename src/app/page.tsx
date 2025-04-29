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
  const { isConnected, isConnecting, user, error } = useDiscordAuth();
  const [loginChecked, setLoginChecked] = useState(false);

  // This ensures hydration issues are avoided
  useEffect(() => {
    setIsClient(true);

    // Add an unhandled rejection handler for debugging purposes
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Check if auth token exists and handle initial state
  useEffect(() => {
    try {
      const token = localStorage.getItem('discord_access_token');
      if (token && !isConnected && !isConnecting) {
        // We have a token but no user loaded yet - this is the transition state
        // that causes the login-not-logged-in flash effect
        setLoginChecked(false);
      } else {
        setLoginChecked(true);
      }
    } catch (err) {
      console.error('Error checking login state:', err);
      setLoginChecked(true); // Proceed even if there's an error
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

      {/* Error display */}
      {error && (
        <div className="w-full max-w-2xl mb-4">
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md">
            <p className="font-medium">로그인 중 문제가 발생했습니다</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl mb-6">
        <div className="flex justify-between items-center">
          {isClient && <DiscordLoginButton />}
          <Link href="/ranking" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
            Leaderboard &rarr;
          </Link>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        {isConnecting ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="ml-3 text-gray-400">디스코드 연결 중...</span>
          </div>
        ) : (
          <CharactersList />
        )}
        
        {isConnected && <LeagueSelector />}
        
        {!isConnected && !isConnecting && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Connect to Play</h2>
            <p className="text-gray-400 mb-4">
              Summon your heroes and enter the arena. Compete across leagues by connecting with Discord.
            </p>
            
            {/* Connection status check */}
            <div className="mt-4 text-sm text-gray-500">
              <p>디스코드 로그인 상태: {isConnected ? '연결됨' : '연결되지 않음'}</p>
              <p>연결 시도 중: {isConnecting ? '예' : '아니오'}</p>
              {isClient && (
                <p>토큰 존재: {localStorage.getItem('discord_access_token') ? '예' : '아니오'}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Health check button for debugging */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={async () => {
            try {
              const res = await fetch('/api/health');
              const data = await res.json();
              alert('Health check: ' + JSON.stringify(data));
            } catch (err) {
              alert('Health check failed: ' + (err instanceof Error ? err.message : String(err)));
            }
          }}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded"
        >
          Health Check
        </button>
      </div>
    </main>
  );
}
