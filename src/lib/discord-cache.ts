/**
 * Discord API request optimization caching utility
 * Reduces duplicate API requests and prevents rate limiting
 */

interface UserCache {
  userId: string;
  data: any; // User information cache
  timestamp: number; // Cache storage time
}

// Cache validity period (10 minutes)
const CACHE_TTL = 10 * 60 * 1000;

// In-memory cache storage
let userCache: UserCache | null = null;

/**
 * Store user information in cache
 */
export function cacheUserData(userId: string, data: any): void {
  userCache = {
    userId,
    data,
    timestamp: Date.now(),
  };

  // Also cache in localStorage (for page refreshes)
  try {
    localStorage.setItem('discord_user_cache', JSON.stringify(userCache));
  } catch (e) {
    console.error('Failed to cache user data in localStorage:', e);
  }
}

/**
 * Retrieve user information from cache
 * @param userId User ID
 * @returns Cached user information or null (if cache expired or not found)
 */
export function getCachedUserData(userId: string): any | null {
  // Check memory cache
  if (userCache && userCache.userId === userId) {
    // Check if cache is expired
    if (Date.now() - userCache.timestamp < CACHE_TTL) {
      return userCache.data;
    }
  }

  // Check localStorage cache
  try {
    const cachedData = localStorage.getItem('discord_user_cache');
    if (cachedData) {
      const parsedCache = JSON.parse(cachedData) as UserCache;

      if (parsedCache.userId === userId && Date.now() - parsedCache.timestamp < CACHE_TTL) {
        // Update memory cache
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
 * Invalidate user cache
 */
export function invalidateUserCache(): void {
  userCache = null;
  try {
    localStorage.removeItem('discord_user_cache');
  } catch (e) {
    console.error('Failed to invalidate user cache:', e);
  }
}
