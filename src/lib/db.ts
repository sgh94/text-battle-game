import { kv } from '@vercel/kv';

// Discord 사용자 정보 타입
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  roles: string[];
  leagues: string[];
  primaryLeague: string;
  createdAt: string;
  updatedAt: string;
}

// Discord 토큰 정보 타입
export interface DiscordToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // 토큰 만료 시간 (밀리초 단위의 타임스탬프)
}

// 사용자 저장 키 형식
const getUserKey = (userId: string) => `user:${userId}`;
const getTokenKey = (userId: string) => `token:${userId}`;

// Discord 사용자 정보 저장
export async function saveDiscordUser(user: DiscordUser): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const userData = {
      ...user,
      updatedAt: now,
      createdAt: user.createdAt || now,
    };
    
    await kv.set(getUserKey(user.id), userData);
    return true;
  } catch (error) {
    console.error('Error saving Discord user:', error);
    return false;
  }
}

// Discord 토큰 정보 저장
export async function saveDiscordToken(userId: string, tokenData: DiscordToken): Promise<boolean> {
  try {
    await kv.set(getTokenKey(userId), tokenData);
    return true;
  } catch (error) {
    console.error('Error saving Discord token:', error);
    return false;
  }
}

// Discord 사용자 정보 조회
export async function getDiscordUser(userId: string): Promise<DiscordUser | null> {
  try {
    const user = await kv.get<DiscordUser>(getUserKey(userId));
    return user;
  } catch (error) {
    console.error('Error getting Discord user:', error);
    return null;
  }
}

// Discord 토큰 정보 조회
export async function getDiscordToken(userId: string): Promise<DiscordToken | null> {
  try {
    const token = await kv.get<DiscordToken>(getTokenKey(userId));
    return token;
  } catch (error) {
    console.error('Error getting Discord token:', error);
    return null;
  }
}

// Discord 사용자 역할 업데이트
export async function updateUserRoles(
  userId: string,
  roles: string[],
  leagues: string[],
  primaryLeague: string
): Promise<boolean> {
  try {
    const user = await getDiscordUser(userId);
    if (!user) return false;
    
    const updatedUser = {
      ...user,
      roles,
      leagues,
      primaryLeague,
      updatedAt: new Date().toISOString(),
    };
    
    await kv.set(getUserKey(userId), updatedUser);
    return true;
  } catch (error) {
    console.error('Error updating user roles:', error);
    return false;
  }
}

// 토큰이 유효한지 확인
export function isTokenValid(token: DiscordToken | null): boolean {
  if (!token) return false;
  
  // 현재 시간보다 만료 시간이 나중인지 확인 (10분의 버퍼 추가)
  return token.expires_at > Date.now() + 10 * 60 * 1000;
}

// 리그별 사용자 리스트 조회 (페이지네이션)
export async function getUsersByLeague(
  league: string,
  limit = 10,
  cursor?: string
): Promise<{ users: DiscordUser[]; nextCursor: string | null }> {
  try {
    // 페이지네이션을 위한 스캔 방식
    // 실제 사용에서는 보다 효율적인 방법을 사용해야 함
    // 이 예제에서는 단순화된 구현을 제공
    
    // 페이지네이션 구현을 위해 패턴 매칭을 사용하여 사용자 키를 스캔
    const scanResult = await kv.scan(0, {
      match: 'user:*',
      count: 100, // 한 번에 가져올 최대 항목 수
    });
    
    const [, keys] = scanResult;
    const users: DiscordUser[] = [];
    
    for (const key of keys) {
      const user = await kv.get<DiscordUser>(key);
      if (user && user.leagues && user.leagues.includes(league)) {
        users.push(user);
      }
      
      if (users.length >= limit) break;
    }
    
    return {
      users,
      nextCursor: null, // 실제 구현에서는 다음 커서 값을 계산해야 함
    };
  } catch (error) {
    console.error('Error getting users by league:', error);
    return { users: [], nextCursor: null };
  }
}

// 모든 사용자 삭제 (개발 환경에서만 사용)
export async function deleteAllUsers(): Promise<boolean> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Cannot delete all users in production');
    return false;
  }
  
  try {
    const scanResult = await kv.scan(0, { match: 'user:*' });
    const [, keys] = scanResult;
    
    for (const key of keys) {
      await kv.del(key);
    }
    
    const tokenScanResult = await kv.scan(0, { match: 'token:*' });
    const [, tokenKeys] = tokenScanResult;
    
    for (const key of tokenKeys) {
      await kv.del(key);
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting all users:', error);
    return false;
  }
}
