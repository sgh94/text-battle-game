import { NextRequest, NextResponse } from 'next/server';
import { refreshToken, DiscordAPIError } from '@/lib/discord-api';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken: token, userId } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'No user ID provided' },
        { status: 400 }
      );
    }

    // 토큰 갱신 시도
    const newToken = await refreshToken(userId, token);

    return NextResponse.json(newToken);
  } catch (error) {
    console.error('Token refresh error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to refresh token',
        code: 'REFRESH_ERROR'
      },
      { status: 500 }
    );
  }
}
