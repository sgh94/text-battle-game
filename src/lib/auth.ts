import { NextRequest } from 'next/server';
import { ethers } from 'ethers';
import { getDiscordUser } from './db';

// Auth token type
type AuthToken = {
  address: string;
  timestamp: number;
  expiresAt: number;
};

// Storage key for token cache in localStorage (client-side)
const AUTH_TOKEN_STORAGE_KEY = 'text_battle_auth_tokens';

// In-memory cache for server-side
const serverTokenCache = new Map<string, AuthToken>();

// Get tokens from storage
function getStoredTokens(): Record<string, AuthToken> {
  if (typeof window === 'undefined') {
    // Server-side, use in-memory cache
    return Object.fromEntries(serverTokenCache.entries());
  } else {
    // Client-side, use localStorage
    try {
      const storedTokens = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      return storedTokens ? JSON.parse(storedTokens) : {};
    } catch (error) {
      console.error('Failed to parse stored tokens:', error);
      return {};
    }
  }
}

// Save token to storage
function saveToken(cacheKey: string, token: AuthToken): void {
  if (typeof window === 'undefined') {
    // Server-side, use in-memory cache
    serverTokenCache.set(cacheKey, token);
  } else {
    // Client-side, use localStorage
    try {
      const tokens = getStoredTokens();
      tokens[cacheKey] = token;
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }
}

// Validate authentication from the request headers
export async function validateAuth(request: NextRequest) {
  try {
    const auth = request.headers.get('Authorization');
    
    if (!auth) {
      return { isValid: false, error: 'Authorization header missing' };
    }
    
    // Expected format: Bearer address:timestamp:signature
    const parts = auth.replace('Bearer ', '').split(':');
    
    if (parts.length !== 3) {
      return { isValid: false, error: 'Invalid authorization format' };
    }
    
    const [address, timestamp, signature] = parts;
    
    // Check cache first to avoid redundant validation
    const cacheKey = `${address.toLowerCase()}:${timestamp}:${signature.substring(0, 10)}`;
    const tokens = getStoredTokens();
    const cachedToken = tokens[cacheKey];
    
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return { isValid: true, address: cachedToken.address };
    }
    
    // Check if the timestamp is recent (within last 30 minutes)
    const now = Date.now();
    const authTime = parseInt(timestamp);
    const expirationTime = 30 * 60 * 1000; // 30 minutes
    
    if (isNaN(authTime) || now - authTime > expirationTime) {
      return { isValid: false, error: 'Authentication expired' };
    }
    
    // For local development/testing, bypass signature verification if env var is set
    if (process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true') {
      console.warn('⚠️ Auth signature verification bypassed for development');
      
      // Store in cache
      const newToken = {
        address: address.toLowerCase(),
        timestamp: authTime,
        expiresAt: now + expirationTime
      };
      
      saveToken(cacheKey, newToken);
      
      return { isValid: true, address: address.toLowerCase() };
    }

    // Check if this is Discord authentication (signature contains "discord_auth_")
    if (signature.startsWith('discord_auth_')) {
      // Verify Discord user exists in the database
      const discordUserId = address;
      const discordUser = await getDiscordUser(discordUserId);
      
      if (!discordUser) {
        return { isValid: false, error: 'Discord user not found' };
      }
      
      // Store valid token in cache
      const newToken = {
        address: discordUserId.toLowerCase(),
        timestamp: authTime,
        expiresAt: now + expirationTime
      };
      
      saveToken(cacheKey, newToken);
      
      return { isValid: true, address: discordUserId.toLowerCase() };
    }
    
    // Verify Ethereum signature (for wallets)
    try {
      // Recreate the message that was signed
      const message = `Authenticate for Text Battle Game: ${timestamp}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return { isValid: false, error: 'Invalid signature' };
      }
      
      // Store valid token in cache
      const newToken = {
        address: address.toLowerCase(),
        timestamp: authTime,
        expiresAt: now + expirationTime
      };
      
      saveToken(cacheKey, newToken);
      
      return { isValid: true, address: address.toLowerCase() };
    } catch (error) {
      console.error('Signature verification error:', error);
      return { isValid: false, error: 'Signature verification failed' };
    }
  } catch (error) {
    console.error('Auth validation error:', error);
    return { isValid: false, error: 'Authentication error' };
  }
}

// Create a development auth token for testing
export function createDevAuthToken(address: string): string {
  const timestamp = Date.now().toString();
  // Use a fixed "signature" for development
  const devSignature = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  
  // Add to valid tokens
  const cacheKey = `${address.toLowerCase()}:${timestamp}:${devSignature.substring(0, 10)}`;
  const newToken = {
    address: address.toLowerCase(),
    timestamp: parseInt(timestamp),
    expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
  };
  
  saveToken(cacheKey, newToken);
  
  return `Bearer ${address}:${timestamp}:${devSignature}`;
}
