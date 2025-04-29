/**
 * 디스코드 API 요청 최적화를 위한 캐싱 유틸리티
 * 중복 API 요청을 줄이고 속도 제한을 방지
 */

interface UserCache {
  userId: string;
  data: any; // 사용자 정보 캐시
  timestamp: number; // 캐시 저장 시간
}

// 캐시 유효 시간 (10분)
const CACHE_TTL = 10 * 60 * 1000;

// 메모리 내 캐시 저장소
let userCache: UserCache | null = null;

/**
 * 사용자 정보를 캐시에 저장
 */
export function cacheUserData(userId: string, data: any): void {
  userCache = {
    userId,
    data,
    timestamp: Date.now(),
  };
  
  // 로컬 스토리지에도 캐싱 (페이지 새로고침용)
  try {
    localStorage.setItem('discord_user_cache', JSON.stringify(userCache));
  } catch (e) {
    console.error('Failed to cache user data in localStorage:', e);
  }
}

/**
 * 캐시에서 사용자 정보 조회
 * @param userId 사용자 ID
 * @returns 캐시된 사용자 정보 또는 null (캐시 만료 또는 없음)
 */
export function getCachedUserData(userId: string): any | null {
  // 메모리 캐시 확인
  if (userCache && userCache.userId === userId) {
    // 캐시 만료 여부 확인
    if (Date.now() - userCache.timestamp < CACHE_TTL) {
      return userCache.data;
    }
  }
  
  // 로컬 스토리지 캐시 확인
  try {
    const cachedData = localStorage.getItem('discord_user_cache');
    if (cachedData) {
      const parsedCache = JSON.parse(cachedData) as UserCache;
      
      if (parsedCache.userId === userId && Date.now() - parsedCache.timestamp < CACHE_TTL) {
        // 메모리 캐시 업데이트
        userCache = parsedCache;
        return parsedCache.data;
      }
    }
  } catch (e) {
    console.error('Failed to retrieve cached user data:', e);
  }
  
  return null;
}

/**
 * 사용자 캐시 무효화
 */
export function invalidateUserCache(): void {
  userCache = null;
  try {
    localStorage.removeItem('discord_user_cache');
  } catch (e) {
    console.error('Failed to invalidate user cache:', e);
  }
}
