import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, DiscordAPIError } from '@/lib/discord-api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code, codeVerifier } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    console.log('Token exchange request received:');
    console.log('- Code:', code ? `${code.substring(0, 10)}...` : 'missing');
    console.log('- Code verifier:', codeVerifier ? `present (${codeVerifier.length} chars)` : 'missing');

    // Environment variables verification
    if (!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
      console.error('Discord client ID not configured');
      return NextResponse.json(
        { error: 'Discord client ID not configured', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    if (!process.env.DISCORD_CLIENT_SECRET) {
      console.error('Discord client secret not configured');
      return NextResponse.json(
        { error: 'Discord client secret not configured', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // 인증 코드를 액세스 토큰으로 교환 (PKCE 코드 검증기 포함)
    const tokenData = await exchangeCodeForToken(code, codeVerifier);

    console.log('Token exchange successful');
    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);

    // Discord API 오류 처리
    if (error instanceof DiscordAPIError) {
      // Special handling for rate limiting
      if (error.status === 429 && error.retryAfter) {
        return NextResponse.json(
          { error: 'Rate limited by Discord, please try again later', code: 'RATE_LIMITED' },
          { 
            status: 429,
            headers: {
              'Retry-After': String(error.retryAfter)
            }
          }
        );
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    // Network error handling
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Network error when connecting to Discord. Please check your internet connection.', 
          code: 'NETWORK_ERROR' 
        },
        { status: 503 }
      );
    }

    // 기타 오류 처리
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to exchange token',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
