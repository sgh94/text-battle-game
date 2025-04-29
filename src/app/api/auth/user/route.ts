import { NextRequest, NextResponse } from 'next/server';
import { fetchDiscordUser, fetchUserGuildRoles, DiscordAPIError } from '@/lib/discord-api';
import { determineUserLeagues, getPrimaryLeague } from '@/lib/discord-roles';

export async function GET(request: NextRequest) {
  try {
    // 헤더에서 액세스 토큰 추출
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No access token provided' }, 
        { status: 401 }
      );
    }

    // Discord에서 사용자 정보 가져오기
    const userData = await fetchDiscordUser(token);

    // 사용자의 길드 역할 가져오기
    const userRoles = await fetchUserGuildRoles(token, userData.id);

    // 역할 기반으로 리그 확인
    const leagues = determineUserLeagues(userRoles);
    const primaryLeague = getPrimaryLeague(leagues);

    // 필요한 사용자 정보만 응답
    const responseData = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0',
      avatar: userData.avatar,
      roles: userRoles,
      leagues,
      primaryLeague,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching user data:', error);

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
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
