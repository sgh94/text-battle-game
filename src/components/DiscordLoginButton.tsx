'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { LEAGUES } from '@/lib/discord-roles';

// Popover menu type
type PopoverMenuState = 'closed' | 'open';

export function DiscordLoginButton() {
  const [mounted, setMounted] = useState(false);
  const [menuState, setMenuState] = useState<PopoverMenuState>('closed');
  const [loginError, setLoginError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, isConnected, isConnecting, error, login, logout, refreshRoles } = useDiscordAuth();

  // SSR support
  useEffect(() => {
    setMounted(true);
  }, []);

  // Error from useDiscordAuth hook
  useEffect(() => {
    if (error) {
      setLoginError(error);
      // Clear error after 5 seconds
      const timer = setTimeout(() => {
        setLoginError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Detect click outside popover menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuState('closed');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // SSR support
  if (!mounted) return null;

  // User avatar URL generator
  const getUserAvatarUrl = () => {
    if (!user?.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  };

  // Role refresh handler
  const handleRefreshRoles = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await refreshRoles();
      setMenuState('closed');
    } catch (err) {
      console.error('Error refreshing roles:', err);
    }
  };

  // Logout handler
  const handleLogout = (e: React.MouseEvent) => {
    e.stopPropagation();
    logout();
    setMenuState('closed');
  };

  // Login handler
  const handleLogin = () => {
    try {
      setLoginError(null);
      login();
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setLoginError(err.message);
      } else {
        setLoginError('Login failed');
      }
    }
  };

  // League color
  const getLeagueColor = () => {
    if (!user?.primaryLeague) return '#888888';

    const league = LEAGUES[user.primaryLeague as keyof typeof LEAGUES];
    return league ? league.color : '#888888';
  };

  // League icon
  const getLeagueIcon = () => {
    if (!user?.primaryLeague) return '🏆';

    const league = LEAGUES[user.primaryLeague as keyof typeof LEAGUES];
    return league ? league.icon : '🏆';
  };

  // Get primary league name
  const getPrimaryLeagueName = () => {
    if (!user?.primaryLeague) return 'Bronze';
    
    // Safely get the first character and capitalize it
    const firstChar = user.primaryLeague.charAt(0).toUpperCase();
    // Safely get the rest of the string
    const rest = user.primaryLeague.slice(1) || '';
    
    return firstChar + rest;
  };

  // Get username with fallback
  const getUsername = () => {
    return user?.username || 'User';
  };

  // Get username first character for avatar fallback
  const getUsernameInitial = () => {
    const username = getUsername();
    return username.charAt(0).toUpperCase() || 'U';
  };

  return (
    <div className="relative">
      {/* Error message display */}
      {loginError && (
        <div className="mb-2 p-2 bg-red-600 text-white text-sm rounded-md animate-pulse max-w-md absolute -top-12 right-0">
          {loginError}
        </div>
      )}

      {!isConnected ? (
        <div>
          <button
            onClick={handleLogin}
            disabled={isConnecting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-opacity duration-200 disabled:opacity-70"
          >
            <svg width="20" height="20" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="white" />
            </svg>
            {isConnecting ? 'Connecting to Discord...' : 'Sign in with Discord'}
          </button>

          {/* Error message for Discord client ID not configured */}
          <div className="text-red-500 text-sm mt-2">
            {process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
              ? ''
              : 'Discord client ID not configured'}
          </div>
        </div>
      ) : (
        <div className="relative">
          <div
            onClick={() => setMenuState(menuState === 'open' ? 'closed' : 'open')}
            className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {/* User avatar */}
            {getUserAvatarUrl() ? (
              <div className="w-8 h-8 rounded-full overflow-hidden">
                <img
                  src={getUserAvatarUrl()!}
                  alt={getUsername()}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-indigo-200 dark:bg-indigo-700 rounded-full flex items-center justify-center">
                <span className="text-indigo-700 dark:text-indigo-200 text-sm font-bold">
                  {getUsernameInitial()}
                </span>
              </div>
            )}

            <div className="flex flex-col text-left">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {getUsername()}
              </span>
              <div className="flex items-center">
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: getLeagueColor() + '33', color: getLeagueColor() }}
                >
                  {getLeagueIcon()} {getPrimaryLeagueName()}
                </span>
              </div>
            </div>

            {/* Dropdown arrow */}
            <svg
              className={`w-4 h-4 ml-1 transition-transform duration-200 ${menuState === 'open' ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Dropdown menu */}
          {menuState === 'open' && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-20 border border-gray-200 dark:border-gray-700"
            >
              <div className="py-1">
                <button
                  onClick={handleRefreshRoles}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  disabled={isConnecting}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isConnecting ? 'Refreshing roles...' : 'Refresh Discord roles'}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const dynamic = 'force-dynamic';
