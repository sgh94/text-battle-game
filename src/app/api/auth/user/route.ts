import { NextRequest, NextResponse } from 'next/server';
import { fetchDiscordUser, fetchUserGuildRoles, DiscordAPIError } from '@/lib/discord-api';
import { determineUserLeagues, getPrimaryLeague } from '@/lib/discord-roles';

// 서버 측 API 요청 추적 - 중복 요청 방지
const requestCounts: Record<string, number> = {};
const lastRequestTimes: Record<string, number> = {};

// 요청 제한 설정
const MIN_REQUEST_INTERVAL = 5000; // 같은 토큰으로 5초 안에 재요청 방지

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
    const tokenKey = token.substring(0, 20); // 토큰 식별자

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }
    
    // 중복 요청 체크 및 API 요청 속도 제한
    const now = Date.now();
    const lastRequestTime = lastRequestTimes[tokenKey] || 0;
    
    // 너무 빠른 속도로 연속 호출되는 경우
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      requestCounts[tokenKey] = (requestCounts[tokenKey] || 0) + 1;
      
      // 연속 요청이 너무 많으면 속도 제한 응답
      if (requestCounts[tokenKey] > 3) {
        const waitSeconds = Math.ceil(MIN_REQUEST_INTERVAL / 1000);
        console.log(`Rate limiting user request, too many requests in short time`);
        
        return NextResponse.json(
          { 
            error: `Too many requests. Please wait ${waitSeconds} seconds.`,
            code: 'TOO_MANY_REQUESTS'
          },
          { 
            status: 429,
            headers: {
              'Retry-After': `${waitSeconds}`
            }
          }
        );
      }
      
      // 캐시 헤더 추가하여 응답 재사용 유도
      console.log('Recent request detected, returning cached response');
      return NextResponse.json(
        { 
          message: 'Please use cached response',
          cacheTime: lastRequestTime
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'max-age=5',
          }
        }
      );
    }
    
    // 토큰으로 첫 요청이거나 충분한 시간이 경과한 경우 카운트 초기화
    requestCounts[tokenKey] = 0;
    lastRequestTimes[tokenKey] = now;
    
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
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=300', // 5분간 캐시 허용
      }
    });
    
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
