'use client';

import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { generateRandomString, generateCodeChallenge } from '@/lib/pkce';
import { determineUserLeagues, getPrimaryLeague, generateRoleDescription } from '@/lib/discord-roles';
import { useRouter } from 'next/navigation';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  roles: string[];
  leagues: string[];
  primaryLeague: string | null;
  roleDescription: string;
}

interface AuthContextType {
  user: DiscordUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// 정확한 리다이렉트 URI - Discord 개발자 포털에 등록된 URI와 일치해야 함
const REDIRECT_URI = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/auth/callback' 
  : 'https://character-battle-game.vercel.app/auth/callback';

export function DiscordAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Helper function to check if token is expired
  const isTokenExpired = (expiresAt: number) => {
    return Date.now() >= expiresAt;
  };

  // Fetch user info from Discord API
  const fetchUserInfo = useCallback(async (accessToken: string, retries = 0) => {
    try {
      console.log('Fetching user info, attempt:', retries + 1);
      
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // If we get rate limited (429), wait and retry
        if (response.status === 429 && retries < 3) {
          console.log('Rate limited, waiting to retry...');
          const retryAfter = response.headers.get('Retry-After') || '2';
          const delay = parseInt(retryAfter, 10) * 1000 || 2000;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchUserInfo(accessToken, retries + 1);
        }
        
        console.error('Failed to fetch user info:', await response.text());
        throw new Error('Failed to fetch user info');
      }

      const userData = await response.json();

      // Make sure roles is always an array
      const roles = Array.isArray(userData.roles) ? userData.roles : [];
      
      // Determine available leagues based on roles
      const userLeagues = determineUserLeagues(roles);
      const primaryLeague = getPrimaryLeague(userLeagues);

      const userInfo = {
        id: userData.id || '',
        username: userData.username || '',
        avatar: userData.avatar || null,
        roles: roles,
        leagues: userLeagues,
        primaryLeague,
        roleDescription: generateRoleDescription(roles),
      };

      setUser(userInfo);

      // Force a router refresh to update UI
      router.refresh();

      // If this is a new connection, log it for debugging
      console.log('Discord user connected:', userData.username);
      return userInfo;
    } catch (err) {
      console.error('Error fetching user info:', err);
      
      // Only retry for network errors, not for logical errors
      if (retries < 3 && (err instanceof TypeError || (err as any)?.code === 'FETCH_ROLES_FAILED')) {
        console.log('Retrying user info fetch after error...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchUserInfo(accessToken, retries + 1);
      }
      
      throw err;
    }
  }, [router]);

  // Function to refresh access token using refresh token
  const refreshAccessToken = useCallback(async (refreshToken: string) => {
    try {
      setIsConnecting(true);
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, userId: user?.id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData = await response.json();

      // Save new tokens
      localStorage.setItem('discord_access_token', tokenData.access_token);
      localStorage.setItem('discord_refresh_token', tokenData.refresh_token);

      // Calculate when the token expires
      const expiresAt = Date.now() + tokenData.expires_in * 1000;
      localStorage.setItem('discord_expires_at', expiresAt.toString());

      // Fetch user info with the new token
      return await fetchUserInfo(tokenData.access_token);
    } catch (err) {
      console.error('Token refresh error:', err);
      // If refresh fails, log out the user
      logout();
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [fetchUserInfo, user?.id]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('discord_access_token');
    localStorage.removeItem('discord_refresh_token');
    localStorage.removeItem('discord_expires_at');
    localStorage.removeItem('discord_auth_state');
    localStorage.removeItem('discord_code_verifier');
    setUser(null);
    
    // Force UI update
    router.refresh();
  }, [router]);

  // Check for existing session on mount and periodically try to fetch user data if needed
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsConnecting(true);
        
        // Check if there's a token in localStorage and if it's not expired
        const accessToken = localStorage.getItem('discord_access_token');
        const expiresAt = Number(localStorage.getItem('discord_expires_at') || '0');
        const refreshToken = localStorage.getItem('discord_refresh_token');

        if (!accessToken) {
          setIsInitialized(true);
          return;
        }

        // If token is expired, try to refresh it
        if (isTokenExpired(expiresAt) && refreshToken) {
          await refreshAccessToken(refreshToken);
          setIsInitialized(true);
          return;
        }

        // If we have a valid token, fetch the user info
        await fetchUserInfo(accessToken);
        setIsInitialized(true);
      } catch (err) {
        console.error('Auth check error:', err);
        // Clear tokens if they're invalid
        logout();
        setIsInitialized(true);
      } finally {
        setIsConnecting(false);
      }
    };

    checkAuth();

    // If user is not set after initialization and we have a retry count less than 3,
    // try to fetch user data again after a delay
    const retryTimer = setInterval(() => {
      if (isInitialized && !user && retryCount < 3) {
        const accessToken = localStorage.getItem('discord_access_token');
        if (accessToken) {
          console.log('Retrying user info fetch, attempt:', retryCount + 1);
          fetchUserInfo(accessToken).catch(err => console.error('Retry fetch error:', err));
          setRetryCount(prev => prev + 1);
        } else {
          clearInterval(retryTimer);
        }
      } else if (retryCount >= 3 || user) {
        clearInterval(retryTimer);
      }
    }, 2000); // Retry every 2 seconds

    return () => clearInterval(retryTimer);
  }, [fetchUserInfo, refreshAccessToken, logout, isInitialized, user, retryCount]);

  // Handle Discord OAuth callback
  useEffect(() => {
    if (!isInitialized) return;

    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const storedState = localStorage.getItem('discord_auth_state');
      const codeVerifier = localStorage.getItem('discord_code_verifier');

      // Clear URL params without refreshing the page
      if (code) {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.href);
      }

      // If we have a code and the state matches, exchange it for a token
      if (code && state && storedState && state === storedState) {
        try {
          setIsConnecting(true);
          setError(null);

          // This is important for logging
          console.log('Attempting to exchange code for token:');
          console.log('- Code verifier:', codeVerifier ? `present (${codeVerifier.length} chars)` : 'missing');
          console.log('- State match:', state === storedState);

          // Clean up localStorage
          localStorage.removeItem('discord_auth_state');
          
          // Exchange code for token
          const tokenResponse = await fetch('/api/auth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              code, 
              codeVerifier 
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({ error: 'Failed to parse error response' }));
            throw new Error(`Token exchange failed: ${errorData.error || tokenResponse.statusText}`);
          }

          const tokenData = await tokenResponse.json();

          // Save tokens
          localStorage.setItem('discord_access_token', tokenData.access_token);
          localStorage.setItem('discord_refresh_token', tokenData.refresh_token);

          // Calculate when the token expires
          const expiresAt = Date.now() + tokenData.expires_in * 1000;
          localStorage.setItem('discord_expires_at', expiresAt.toString());

          // Now remove the code verifier as it's no longer needed
          localStorage.removeItem('discord_code_verifier');

          // Fetch user info with the new token
          await fetchUserInfo(tokenData.access_token);
          
          // Force a navigation refresh to update UI immediately
          router.refresh();
        } catch (err) {
          console.error('Auth callback error:', err);
          if (err instanceof Error) {
            setError(err.message);
          } else {
            setError('Authentication failed');
          }
          logout();
        } finally {
          setIsConnecting(false);
        }
      }
    };

    handleCallback();
  }, [isInitialized, fetchUserInfo, logout, router]);

  // Refresh user roles
  const refreshRoles = async () => {
    try {
      setIsConnecting(true);
      const accessToken = localStorage.getItem('discord_access_token');
      if (!accessToken) {
        throw new Error('Not logged in');
      }

      await fetchUserInfo(accessToken);
      // Force UI update
      router.refresh();
    } catch (err) {
      console.error('Role refresh error:', err);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  // Login function
  const login = () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Generate PKCE code verifier and challenge
      const codeVerifier = generateRandomString(128);
      
      // Generate state parameter
      const state = generateRandomString(40);
      localStorage.setItem('discord_auth_state', state);
      localStorage.setItem('discord_code_verifier', codeVerifier);

      console.log('Starting login process:');
      console.log('- Generated code verifier:', codeVerifier ? `${codeVerifier.substring(0, 10)}... (${codeVerifier.length} chars)` : 'none');
      console.log('- Generated state:', state ? `${state.substring(0, 10)}... (${state.length} chars)` : 'none');
      console.log('- Using redirect URI:', REDIRECT_URI);

      // Generate the code challenge from the verifier
      generateCodeChallenge(codeVerifier).then(codeChallenge => {
        // Construct auth URL
        const baseUrl = 'https://discord.com/api/oauth2/authorize';
        const params = new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1088729716317495367',
          redirect_uri: REDIRECT_URI,
          response_type: 'code',
          scope: 'identify guilds guilds.members.read',
          state,
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        });

        const authUrl = `${baseUrl}?${params.toString()}`;
        console.log('Redirecting to:', authUrl);
        
        window.location.href = authUrl;
      }).catch(err => {
        console.error('Error generating code challenge:', err);
        setError('Failed to start authentication');
        setIsConnecting(false);
      });
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login initialization failed');
      }
      setIsConnecting(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isConnected: !!user,
        isConnecting,
        error,
        login,
        logout,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useDiscordAuth() {
  return useContext(AuthContext);
}
