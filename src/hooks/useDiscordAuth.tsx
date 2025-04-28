'use client';

import { useState, useEffect, createContext, useContext } from 'react';

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  roles: string[];
  primaryLeague?: string;
  leagues?: string[];
}

interface DiscordAuthContextType {
  user: DiscordUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  refreshRoles: () => Promise<void>;
}

// Discord authentication related constants
const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const DISCORD_REDIRECT_URI = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || `${window?.location?.origin}/auth/callback`;
const AUTH_STORAGE_KEY = 'text-battle-discord-auth';

// Create context for Discord authentication
const DiscordAuthContext = createContext<DiscordAuthContextType>({
  user: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  login: () => {},
  logout: () => {},
  refreshRoles: async () => {},
});

// Function to retrieve Discord authentication URL
const getDiscordAuthUrl = () => {
  if (!DISCORD_CLIENT_ID) {
    console.error('Discord client ID is not defined');
    return '';
  }

  const scope = 'identify guilds guilds.members.read';
  return `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
};

// Provider component for Discord authentication
export function DiscordAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem(AUTH_STORAGE_KEY);
        if (authData) {
          const userData = JSON.parse(authData) as DiscordUser;
          setUser(userData);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    };

    checkAuth();
  }, []);

  // Redirect to Discord OAuth
  const login = () => {
    setIsConnecting(true);
    setError(null);
    
    const authUrl = getDiscordAuthUrl();
    if (!authUrl) {
      setError('Discord authentication is not properly configured');
      setIsConnecting(false);
      return;
    }
    
    window.location.href = authUrl;
  };

  // Logout user
  const logout = () => {
    setUser(null);
    setIsConnected(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Refresh user's Discord roles
  const refreshRoles = async () => {
    if (!user || !user.id) return;
    
    try {
      setIsConnecting(true);
      setError(null);
      
      // Call API endpoint to refresh roles
      const response = await fetch('/api/discord/refresh-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh Discord roles');
      }
      
      const updatedUser = await response.json();
      
      // Update user data with new roles
      setUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      
    } catch (err) {
      console.error('Error refreshing roles:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh Discord roles');
    } finally {
      setIsConnecting(false);
    }
  };

  const value: DiscordAuthContextType = {
    user,
    isConnected,
    isConnecting,
    error,
    login,
    logout,
    refreshRoles,
  };

  return (
    <DiscordAuthContext.Provider value={value}>
      {children}
    </DiscordAuthContext.Provider>
  );
}

// Hook to use Discord authentication
export function useDiscordAuth() {
  return useContext(DiscordAuthContext);
}
