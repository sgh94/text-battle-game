import { kv } from '@vercel/kv';

// Discord user information type
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

// Discord token information type
export interface DiscordToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Token expiration time (timestamp in milliseconds)
}

// User storage key format
const getUserKey = (userId: string) => `user:${userId}`;
const getTokenKey = (userId: string) => `token:${userId}`;

// Save Discord user information
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

// Save Discord token information
export async function saveDiscordToken(userId: string, tokenData: DiscordToken): Promise<boolean> {
  try {
    await kv.set(getTokenKey(userId), tokenData);
    return true;
  } catch (error) {
    console.error('Error saving Discord token:', error);
    return false;
  }
}

// Retrieve Discord user information
export async function getDiscordUser(userId: string): Promise<DiscordUser | null> {
  try {
    const user = await kv.get<DiscordUser>(getUserKey(userId));
    return user;
  } catch (error) {
    console.error('Error getting Discord user:', error);
    return null;
  }
}

// Retrieve Discord token information
export async function getDiscordToken(userId: string): Promise<DiscordToken | null> {
  try {
    const token = await kv.get<DiscordToken>(getTokenKey(userId));
    return token;
  } catch (error) {
    console.error('Error getting Discord token:', error);
    return null;
  }
}

// Update Discord user roles
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

// Check if token is valid
export function isTokenValid(token: DiscordToken | null): boolean {
  if (!token) return false;

  // Check if expiration time is later than current time (with 10 minute buffer)
  return token.expires_at > Date.now() + 10 * 60 * 1000;
}

// Retrieve users by league (with pagination)
export async function getUsersByLeague(
  league: string,
  limit = 10,
  cursor?: string
): Promise<{ users: DiscordUser[]; nextCursor: string | null }> {
  try {
    // Scan method for pagination
    // In actual use, a more efficient method should be used
    // This example provides a simplified implementation

    // Using pattern matching to scan user keys for pagination implementation
    const scanResult = await kv.scan(0, {
      match: 'user:*',
      count: 100, // Maximum number of items to retrieve at once
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
      nextCursor: null, // In an actual implementation, the next cursor value should be calculated
    };
  } catch (error) {
    console.error('Error getting users by league:', error);
    return { users: [], nextCursor: null };
  }
}

// Delete all users (use only in development environment)
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
