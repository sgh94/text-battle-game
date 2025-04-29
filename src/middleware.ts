import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

export function middleware(request: NextRequest) {
  // Generate a random nonce for CSP
  const nonce = crypto.randomBytes(16).toString('base64');
  
  // Get response
  const response = NextResponse.next();
  
  // Add the nonce to the response
  response.headers.set('x-nonce', nonce);

  // Define Content Security Policy
  // Allows Discord and other necessary services
  const cspHeader = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://cdn.discordapp.com https://cdnjs.cloudflare.com`,
    `style-src 'self' 'unsafe-inline' 'nonce-${nonce}' https://cdn.discordapp.com https://cdnjs.cloudflare.com`,
    "img-src 'self' https: data: blob:",
    "font-src 'self' data: https://cdn.discordapp.com https://cdnjs.cloudflare.com",
    "connect-src 'self' https://discord.com https://*.discord.com https://api.openai.com",
    "frame-src 'self' https://discord.com",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests"
  ].join("; ");

  // Set security headers
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

// Only apply middleware to API routes and main pages that make external requests
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/health).*)',
  ],
};
