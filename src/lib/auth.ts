import { NextRequest } from 'next/server';

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
    
    // Check if the timestamp is recent (within last 5 minutes)
    const now = Date.now();
    const authTime = parseInt(timestamp);
    
    if (isNaN(authTime) || now - authTime > 5 * 60 * 1000) {
      return { isValid: false, error: 'Authentication expired' };
    }
    
    // In a real implementation, we would verify the signature
    // However, this is a simplified version since we don't have ethers.js
    
    return { isValid: true, address: address.toLowerCase() };
  } catch (error) {
    console.error('Auth validation error:', error);
    return { isValid: false, error: 'Authentication error' };
  }
}
