// PKCE (Proof Key for Code Exchange) utilities for OAuth 2.0
// This implements the PKCE extension for OAuth which is more secure for public clients

/**
 * Generates a random string of specified length for use as a code verifier
 */
export function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    text += possible.charAt(randomValues[i] % possible.length);
  }
  
  return text;
}

/**
 * Generates a code challenge from a code verifier using SHA-256
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Hash the code verifier using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  
  // Convert the hash to base64-url format
  return base64UrlEncode(digest);
}

/**
 * Base64-url encodes an ArrayBuffer
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
  // Convert the buffer to a base64 string
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  
  // Convert base64 to base64url by replacing characters
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
