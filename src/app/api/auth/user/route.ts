import { NextRequest, NextResponse } from 'next/server';
import { fetchDiscordUser, fetchUserGuildRoles, DiscordAPIError } from '@/lib/discord-api';
import { determineUserLeagues, getPrimaryLeague } from '@/lib/discord-roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Invalid Authorization header' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7);

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }
    
    console.log('Fetching Discord user info with token');
    
    // 사용자 정보 가져오기
    const userData = await fetchDiscordUser(token);
    
    // 사용자의 길드 역할 가져오기
    let userRoles: string[] = [];
    try {
      userRoles = await fetchUserGuildRoles(token, userData.id);
      console.log('User has', userRoles.length, 'Discord roles');
    } catch (error) {
      console.error('Error fetching guild roles:', error);
      // 역할 가져오기 실패해도 계속 진행 (빈 배열로)
      userRoles = [];
    }
    
    // 역할 기반으로 리그 결정
    const leagues = determineUserLeagues(userRoles);
    const primaryLeague = getPrimaryLeague(leagues);
    
    // 응답 데이터 구성
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
    console.error('Error processing user request:', error);
    
    // Discord API 오류 처리
    if (error instanceof DiscordAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    
    // 일반 오류
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
