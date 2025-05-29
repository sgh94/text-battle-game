'use client';

import { DiscordLoginButton } from '@/components/DiscordLoginButton';
import { CharactersList } from '@/components/CharactersList';
import { LeagueSelector } from '@/components/LeagueSelector';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { isConnected, isConnecting, user, error } = useDiscordAuth();
  const [loginChecked, setLoginChecked] = useState(false);
  // Ref to track router refresh (prevent repeated calls)
  const refreshedRef = useRef(false);

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

  // Force router update only on login/logout
  useEffect(() => {
    // Refresh UI only when user logs in or out, and only once
    if (user && !refreshedRef.current) {
      refreshedRef.current = true;
      // Refresh only once when user info changes
      router.refresh();
    } else if (!user && refreshedRef.current) {
      // Reset refresh state on logout
      refreshedRef.current = false;
    }
  }, [user, router]);

  // Render loading state during transition
  if (!isClient || !loginChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center p-4 md:p-8 pb-20 scroll-container">
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
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-4 md:p-8 pb-20 scroll-container">
      <h1 className="text-3xl font-bold mb-8">Mitosis Text Hero Battle</h1>

      {/* Error display */}
      {error && (
        <div className="w-full max-w-2xl mb-4">
          <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md">
            <p className="font-medium">A problem occurred during login</p>
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

      <div className="w-full max-w-2xl flex-1 overflow-y-auto scrollbar-thin">
        {isConnecting ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            <span className="ml-3 text-gray-400">Entering the arena...</span>
          </div>
        ) : (
          <div className="space-y-6">
            <CharactersList />
            {isConnected && <LeagueSelector />}
          </div>
        )}

        {!isConnected && !isConnecting && (
          <div className="mt-8 bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Connect to Play</h2>
            <p className="text-gray-400 mb-4">
              Summon your heroes and enter the arena. Compete across leagues by connecting with Discord.
            </p>
          </div>
        )}
      </div>

      {/* Display debugging info only in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2 text-xs bg-gray-800 p-2 rounded shadow">
          <div>
            <div>Connection status: {isConnected ? 'Connected' : 'Not connected'}</div>
            <div>Connecting: {isConnecting ? 'Yes' : 'No'}</div>
            {isClient && (
              <div>Token exists: {localStorage.getItem('discord_access_token') ? 'Yes' : 'No'}</div>
            )}
          </div>
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
            className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded"
          >
            Health Check
          </button>
        </div>
      )}
    </div>
  );
}
