'use client';

import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { generateRandomString, generateCodeChallenge } from '@/lib/pkce';
import { determineUserLeagues, getPrimaryLeague, generateRoleDescription } from '@/lib/discord-roles';

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

export function DiscordAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to check if token is expired
  const isTokenExpired = (expiresAt: number) => {
    return Date.now() >= expiresAt;
  };

  // Fetch user info from Discord API
  const fetchUserInfo = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
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

      // If this is a new connection, log it for debugging
      console.log('Discord user connected:', userData.username);
      return userInfo;
    } catch (err) {
      console.error('Error fetching user info:', err);
      throw err;
    }
  }, []);

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
  }, []);

  // Check for existing session on mount
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
  }, [fetchUserInfo, refreshAccessToken, logout]);

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
  }, [isInitialized, fetchUserInfo, logout]);

  // Refresh user roles
  const refreshRoles = async () => {
    try {
      setIsConnecting(true);
      const accessToken = localStorage.getItem('discord_access_token');
      if (!accessToken) {
        throw new Error('Not logged in');
      }

      await fetchUserInfo(accessToken);
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

      // Generate the code challenge from the verifier
      generateCodeChallenge(codeVerifier).then(codeChallenge => {
        // Construct auth URL
        const baseUrl = 'https://discord.com/api/oauth2/authorize';
        const params = new URLSearchParams({
          client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1088729716317495367',
          redirect_uri: typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? 'http://localhost:3000'
            : (process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || 'https://character-battle-game.vercel.app'),
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
