import { NextRequest, NextResponse } from 'next/server';
import { 
  getValidAccessToken, 
  fetchUserGuildRoles,
  fetchDiscordUser,
  DiscordAPIError
} from '@/lib/discord-api';
import { 
  getDiscordUser, 
  updateUserRoles 
} from '@/lib/db';
import { 
  determineUserLeagues, 
  getPrimaryLeague 
} from '@/lib/discord-roles';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // 1. 데이터베이스에서 사용자 정보 조회
    const userProfile = await getDiscordUser(userId);
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    try {
      // 2. 유효한 액세스 토큰 가져오기 (필요시 자동 갱신)
      const accessToken = await getValidAccessToken(userId);
      
      // 3. Discord API를 통해 최신 역할 정보 가져오기
      const updatedRoles = await fetchUserGuildRoles(accessToken, userId);
      
      // 4. 역할 기반으로 리그 계산
      const leagues = determineUserLeagues(updatedRoles);
      const primaryLeague = getPrimaryLeague(leagues);
      
      // 5. 데이터베이스에 사용자 역할 및 리그 정보 업데이트
      await updateUserRoles(userId, updatedRoles, leagues, primaryLeague);
      
      // 6. 갱신된 사용자 정보 반환
      const updatedUserProfile = {
        ...userProfile,
        roles: updatedRoles,
        leagues,
        primaryLeague,
        updatedAt: new Date().toISOString(),
      };
      
      return NextResponse.json(updatedUserProfile);
      
    } catch (error) {
      // 토큰이 만료되었거나 갱신 실패한 경우
      if (error instanceof DiscordAPIError && 
          (error.code === 'TOKEN_NOT_FOUND' || error.code === 'TOKEN_REFRESH_FAILED')) {
        
        return NextResponse.json(
          { 
            error: 'Authentication expired. Please log in again.', 
            code: 'AUTH_EXPIRED' 
          },
          { status: 401 }
        );
      }
      
      // 길드 멤버십 오류 (사용자가 서버에 없는 경우 등)
      if (error instanceof DiscordAPIError && error.code === 'FETCH_ROLES_FAILED') {
        // 사용자가 서버에 없거나 역할이 없는 경우 기본 리그로 설정
        const defaultRoles: string[] = [];
        const leagues = determineUserLeagues(defaultRoles);
        const primaryLeague = getPrimaryLeague(leagues);
        
        // 데이터베이스에 기본 역할 및 리그 정보 업데이트
        await updateUserRoles(userId, defaultRoles, leagues, primaryLeague);
        
        const updatedUserProfile = {
          ...userProfile,
          roles: defaultRoles,
          leagues,
          primaryLeague,
          updatedAt: new Date().toISOString(),
        };
        
        return NextResponse.json(updatedUserProfile);
      }
      
      // 기타 API 오류 처리
      throw error;
    }
    
  } catch (error) {
    console.error('Discord role refresh error:', error);
    
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
        error: error instanceof Error ? error.message : 'Failed to refresh Discord roles',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
