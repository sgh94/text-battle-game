import { NextRequest } from 'next/server';
import { ethers } from 'ethers';

// Store valid auth tokens to prevent excessive signature requests
type AuthToken = {
  address: string;
  timestamp: number;
  expiresAt: number;
};

const validTokens = new Map<string, AuthToken>();

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
    const cachedToken = validTokens.get(cacheKey);
    
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
      validTokens.set(cacheKey, {
        address: address.toLowerCase(),
        timestamp: authTime,
        expiresAt: now + expirationTime
      });
      
      return { isValid: true, address: address.toLowerCase() };
    }
    
    // Verify signature (in production)
    try {
      // Recreate the message that was signed
      const message = `Authenticate for Text Battle Game: ${timestamp}`;
      const recoveredAddress = ethers.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return { isValid: false, error: 'Invalid signature' };
      }
      
      // Store valid token in cache
      validTokens.set(cacheKey, {
        address: address.toLowerCase(),
        timestamp: authTime,
        expiresAt: now + expirationTime
      });
      
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
  validTokens.set(cacheKey, {
    address: address.toLowerCase(),
    timestamp: parseInt(timestamp),
    expiresAt: Date.now() + 30 * 60 * 1000 // 30 minutes
  });
  
  return `Bearer ${address}:${timestamp}:${devSignature}`;
}
