import { NextRequest, NextResponse } from 'next/server';
import { refreshToken, DiscordAPIError } from '@/lib/discord-api';

export const dynamic = 'force-dynamic';

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

    // Attempt to refresh the token
    const newToken = await refreshToken(userId, token);

    return NextResponse.json(newToken);
  } catch (error) {
    console.error('Token refresh error:', error);

    // Handle Discord API errors
    if (error instanceof DiscordAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to refresh token',
        code: 'REFRESH_ERROR'
      },
      { status: 500 }
    );
  }
}
