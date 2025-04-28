import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchUserGuildRoles,
  DiscordAPIError
} from '@/lib/discord-api';
import { DiscordUser, saveDiscordToken, saveDiscordUser } from '@/lib/db';
import { determineUserLeagues, getPrimaryLeague } from '@/lib/discord-roles';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // 필수 환경 변수 체크
    if (!process.env.DISCORD_CLIENT_ID ||
      !process.env.DISCORD_CLIENT_SECRET ||
      !process.env.DISCORD_GUILD_ID) {
      console.error('Missing required environment variables for Discord integration');
      return NextResponse.json(
        { error: 'Discord integration is not properly configured' },
        { status: 500 }
      );
    }

    // 1. 코드를 액세스 토큰으로 교환
    const tokenData = await exchangeCodeForToken(code);

    // 2. Discord 사용자 정보 가져오기
    const userData = await fetchDiscordUser(tokenData.access_token);

    // 3. 사용자의 길드 역할 가져오기
    const userRoles = await fetchUserGuildRoles(tokenData.access_token, userData.id);

    // 4. 역할 기반으로 리그 결정
    const leagues = determineUserLeagues(userRoles);
    const primaryLeague = getPrimaryLeague(leagues);

    // 5. 토큰 정보 저장 (데이터베이스)
    await saveDiscordToken(userData.id, tokenData);

    // 6. 사용자 정보 저장 (데이터베이스)
    const userProfile = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      roles: userRoles,
      leagues,
      primaryLeague,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveDiscordUser(userProfile as DiscordUser);

    // 7. 클라이언트에게 응답 (민감한 토큰 정보 제외)
    const responseData = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      roles: userRoles,
      leagues,
      primaryLeague,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Discord authentication error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to authenticate with Discord',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
