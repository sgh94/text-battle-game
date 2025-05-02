/**
 * PKCE (Proof Key for Code Exchange) Utility Functions
 * 
 * This module provides utilities needed for generating PKCE challenges for OAuth 2.0 authentication.
 * Uses only Web API to be compatible with Edge Runtime.
 */

/**
 * Generate a random string of specified length
 */
export function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);

  // Use Web Crypto API (Edge Runtime compatible)
  self.crypto.getRandomValues(values);

  let result = '';
  for (let i = 0; i < length; i++) {
    result += possible.charAt(values[i] % possible.length);
  }

  return result;
}

/**
 * Convert string to UTF-8 buffer
 */
function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * BASE64URL encoding
 * (URL and filename safe BASE64 encoding)
 */
function base64URLEncode(buffer: ArrayBuffer): string {
  return btoa(Array.from(new Uint8Array(buffer)).map(byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Generate SHA-256 hash (using Web Crypto API)
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

/**
 * Generate PKCE code challenge
 * Creates an S256 code challenge based on the code verifier
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  try {
    const hashed = await sha256(codeVerifier);
    return base64URLEncode(hashed);
  } catch (error) {
    console.error('Error generating code challenge:', error);
    throw new Error('Failed to generate code challenge');
  }
}
