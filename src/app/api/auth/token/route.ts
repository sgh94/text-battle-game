import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, DiscordAPIError } from '@/lib/discord-api';

export async function POST(request: NextRequest) {
  try {
    const { code, codeVerifier } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // 인증 코드를 액세스 토큰으로 교환 (PKCE 코드 검증기 포함)
    const tokenData = await exchangeCodeForToken(code, codeVerifier);

    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);

    // Discord API 오류 처리
    if (error instanceof DiscordAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
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
