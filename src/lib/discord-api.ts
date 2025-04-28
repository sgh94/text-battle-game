// Discord API 통신 및 토큰 관리 모듈

import {
  getDiscordToken,
  saveDiscordToken,
  isTokenValid,
  DiscordToken
} from './db';

// Discord API 설정
const DISCORD_API_URL = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.VERCEL_URL || 'http://localhost:3000'}/auth/callback`;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Discord API 오류 타입
export class DiscordAPIError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string = 'DISCORD_API_ERROR') {
    super(message);
    this.name = 'DiscordAPIError';
    this.status = status;
    this.code = code;
  }
}

// Discord 사용자 정보 타입
export interface DiscordUserData {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  locale?: string;
  verified?: boolean;
  email?: string | null;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}

// Discord 길드 멤버 정보 타입
export interface DiscordGuildMember {
  user?: DiscordUserData;
  nick?: string | null;
  roles: string[];
  joined_at: string;
  premium_since?: string | null;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: string;
}

// 인증 코드를 토큰으로 교환
export async function exchangeCodeForToken(code: string): Promise<DiscordToken> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
  });

  const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new DiscordAPIError(
      data.error || `Failed to exchange code for token: ${response.status}`,
      response.status
    );
  }

  const data = await response.json();

  // 만료 시간 계산
  const expiresAt = Date.now() + data.expires_in * 1000;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  };
}

// 토큰 갱신
export async function refreshToken(userId: string, refreshToken: string): Promise<DiscordToken> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new DiscordAPIError(
      data.error || `Failed to refresh token: ${response.status}`,
      response.status,
      'TOKEN_REFRESH_FAILED'
    );
  }

  const data = await response.json();

  // 만료 시간 계산
  const expiresAt = Date.now() + data.expires_in * 1000;

  const newToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: expiresAt,
  };

  // 토큰 저장
  await saveDiscordToken(userId, newToken);

  return newToken;
}

// 유효한 액세스 토큰 가져오기 (필요시 갱신)
export async function getValidAccessToken(userId: string): Promise<string> {
  const token = await getDiscordToken(userId);

  if (!token) {
    throw new DiscordAPIError('User token not found', 401, 'TOKEN_NOT_FOUND');
  }

  // 토큰이 유효한지 확인
  if (isTokenValid(token)) {
    return token.access_token;
  }

  // 토큰이 만료되었다면 갱신 시도
  try {
    const newToken = await refreshToken(userId, token.refresh_token);
    return newToken.access_token;
  } catch (error) {
    // 토큰 갱신에 실패하면 다시 로그인 필요
    throw new DiscordAPIError(
      'Token expired and refresh failed, please login again',
      401,
      'TOKEN_REFRESH_FAILED'
    );
  }
}

// Discord 사용자 정보 가져오기
export async function fetchDiscordUser(accessToken: string): Promise<DiscordUserData> {
  const response = await fetch(`${DISCORD_API_URL}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new DiscordAPIError(
      data.error || `Failed to fetch user data: ${response.status}`,
      response.status,
      'FETCH_USER_FAILED'
    );
  }

  return response.json();
}

// Discord 길드 내 사용자 역할 정보 가져오기
export async function fetchUserGuildRoles(accessToken: string, userId: string): Promise<string[]> {
  if (!GUILD_ID) {
    throw new DiscordAPIError('Guild ID not configured', 500, 'GUILD_ID_MISSING');
  }

  const response = await fetch(
    `${DISCORD_API_URL}/users/@me/guilds/${GUILD_ID}/member`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    // 사용자가 길드에 없는 경우
    if (response.status === 404) {
      return [];
    }

    const data = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new DiscordAPIError(
      data.error || `Failed to fetch guild roles: ${response.status}`,
      response.status,
      'FETCH_ROLES_FAILED'
    );
  }

  const guildMember = await response.json() as DiscordGuildMember;
  return guildMember.roles || [];
}

// OAuth2 인증 URL 생성
export function getDiscordAuthUrl(): string {
  if (!CLIENT_ID) {
    throw new Error('Discord client ID not configured');
  }

  const scope = 'identify guilds guilds.members.read';
  return `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}`;
}

// Discord 사용자 토큰 취소 (로그아웃 시)
export async function revokeToken(token: string): Promise<boolean> {
  const params = new URLSearchParams({
    client_id: CLIENT_ID!,
    client_secret: CLIENT_SECRET!,
    token,
  });

  const response = await fetch(`${DISCORD_API_URL}/oauth2/token/revoke`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  return response.ok;
}
