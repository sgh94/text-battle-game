// Discord API communication and token management module

import {
  getDiscordToken,
  saveDiscordToken,
  isTokenValid,
  DiscordToken,
} from "./db";

// Discord API configuration
const DISCORD_API_URL = "https://discord.com/api/v10";
// Use a fallback client ID in case the environment variable is not set
const CLIENT_ID =
  process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "1088729716317495367";
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
// Redirect URI - Must exactly match the one registered in the Discord Developer Portal!
const REDIRECT_URI =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/auth/callback"
    : process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || "";

const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Global refresh token lock to prevent concurrent refresh attempts
const refreshingTokens = new Set<string>();

// Simple cache for global request rate limit management
const rateLimitCache = {
  lastRequestTime: 0,
  minDelay: 250, // Minimum 250ms interval between requests (Discord recommended)

  // Ensure delay between requests
  async enforceDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minDelay) {
      const waitTime = this.minDelay - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  },
};

// Discord API error type
export class DiscordAPIError extends Error {
  status: number;
  code: string;
  retryAfter?: number;

  constructor(
    message: string,
    status: number,
    code: string = "DISCORD_API_ERROR",
    retryAfter?: number
  ) {
    super(message);
    this.name = "DiscordAPIError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

// Discord user information type
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

// Discord guild member information type
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

// API request helper with retry logic
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      // Apply delay between requests
      await rateLimitCache.enforceDelay();

      const response = await fetch(url, options);

      // Handle 429 (rate limit) response
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("Retry-After") || "1",
          10
        );
        const waitTime = retryAfter * 1000 || 1000;
        console.log(
          `Rate limited by Discord API. Waiting ${waitTime}ms before retry...`
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retries++;
        continue;
      }

      // Handle 5xx server errors with retry
      if (response.status >= 500 && response.status < 600) {
        console.log(
          `Discord API server error (${response.status}). Retrying...`
        );
        const waitTime = Math.pow(2, retries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        retries++;
        continue;
      }

      return response;
    } catch (error) {
      // Retry for network errors
      console.error(
        `API call failed (attempt ${retries + 1}/${maxRetries}):`,
        error
      );

      if (retries === maxRetries - 1) {
        throw error;
      }

      // Apply exponential backoff (increasing wait time with each retry)
      const waitTime = Math.pow(2, retries) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      retries++;
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}

// Exchange authorization code for token
export async function exchangeCodeForToken(
  code: string,
  code_verifier?: string
): Promise<DiscordToken> {
  if (!CLIENT_ID) {
    throw new Error("Discord client ID not configured");
  }

  if (!CLIENT_SECRET) {
    throw new Error("Discord client secret not configured");
  }

  // Basic parameters
  const params: Record<string, string> = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  };

  // Add code_verifier if authenticating with PKCE
  if (code_verifier) {
    params.code_verifier = code_verifier;
  }

  const formBody = new URLSearchParams(params);

  console.log("Exchanging code for token with params:", {
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    code_verifier: code_verifier ? "(provided)" : "(not provided)",
  });

  try {
    // Increase max retries for token exchange to 5
    const response = await fetchWithRetry(
      `${DISCORD_API_URL}/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      },
      5
    );

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error("Discord API error response:", errorData);
      } catch (e) {
        errorData = { error: "Failed to parse error response" };
        console.error("Failed to parse Discord API error response");
      }

      // Extract retry information
      const retryAfter = parseInt(
        response.headers.get("Retry-After") || "0",
        10
      );

      throw new DiscordAPIError(
        errorData.error ||
          `Failed to exchange code for token: ${response.status}`,
        response.status,
        "TOKEN_EXCHANGE_FAILED",
        retryAfter
      );
    }

    const data = await response.json();

    // Calculate expiration time
    const expiresAt = Date.now() + data.expires_in * 1000;

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    };
  } catch (error) {
    console.error("Token exchange error details:", error);

    // Check if this is a network error and provide a clear message
    if (
      error instanceof TypeError ||
      (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof error.message === "string" &&
        error.message.includes("fetch"))
    ) {
      throw new DiscordAPIError(
        "Network error when connecting to Discord. Please check your internet connection.",
        0,
        "NETWORK_ERROR"
      );
    }

    throw error;
  }
}

// Refresh token
export async function refreshToken(
  userId: string,
  refreshToken: string
): Promise<DiscordToken> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Discord client credentials not configured");
  }

  // Check if we're already refreshing this user's token
  if (refreshingTokens.has(userId)) {
    // Wait a bit and check if a new token is available
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const existingToken = await getDiscordToken(userId);

    if (existingToken && isTokenValid(existingToken)) {
      return existingToken;
    }

    // If still not valid, throw an error to prevent infinite loops
    throw new DiscordAPIError(
      "Token refresh already in progress but not completed",
      409,
      "TOKEN_REFRESH_CONFLICT"
    );
  }

  // Add to the refreshing set to prevent concurrent refreshes
  refreshingTokens.add(userId);

  try {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const response = await fetchWithRetry(
      `${DISCORD_API_URL}/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
      3
    );

    if (!response.ok) {
      const data = await response
        .json()
        .catch(() => ({ error: "Failed to parse error response" }));
      throw new DiscordAPIError(
        data.error || `Failed to refresh token: ${response.status}`,
        response.status,
        "TOKEN_REFRESH_FAILED"
      );
    }

    const data = await response.json();

    // Calculate expiration time
    const expiresAt = Date.now() + data.expires_in * 1000;

    const newToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
    };

    // Save token
    await saveDiscordToken(userId, newToken);

    return newToken;
  } catch (error) {
    console.error(`Token refresh error for user ${userId}:`, error);
    throw error;
  } finally {
    // Always remove from the refreshing set
    refreshingTokens.delete(userId);
  }
}

// Get valid access token (refresh if necessary)
export async function getValidAccessToken(userId: string): Promise<string> {
  const token = await getDiscordToken(userId);

  if (!token) {
    throw new DiscordAPIError("User token not found", 401, "TOKEN_NOT_FOUND");
  }

  // Add buffer time to ensure token isn't about to expire (1 minute)
  const bufferTime = 60 * 1000;
  const isTokenExpiringSoon = token.expires_at < Date.now() + bufferTime;

  // Check if token is valid
  if (!isTokenExpiringSoon) {
    return token.access_token;
  }

  // Try to refresh if token is expired or about to expire
  try {
    const newToken = await refreshToken(userId, token.refresh_token);
    return newToken.access_token;
  } catch (error) {
    // If it's a conflict (already refreshing), try once more after waiting
    if (
      error instanceof DiscordAPIError &&
      error.code === "TOKEN_REFRESH_CONFLICT"
    ) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const retryToken = await getDiscordToken(userId);

      if (retryToken && isTokenValid(retryToken)) {
        return retryToken.access_token;
      }
    }

    // Need to login again if token refresh fails
    throw new DiscordAPIError(
      "Token expired and refresh failed, please login again",
      401,
      "TOKEN_REFRESH_FAILED"
    );
  }
}

// Fetch Discord user information
export async function fetchDiscordUser(
  accessToken: string
): Promise<DiscordUserData> {
  const response = await fetchWithRetry(
    `${DISCORD_API_URL}/users/@me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    3
  );

  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: "Failed to parse error response" }));
    throw new DiscordAPIError(
      data.error || `Failed to fetch user data: ${response.status}`,
      response.status,
      response.status === 401 ? "TOKEN_INVALID" : "FETCH_USER_FAILED"
    );
  }

  return response.json();
}

// Fetch user roles in a Discord guild
export async function fetchUserGuildRoles(
  accessToken: string,
  userId: string
): Promise<string[]> {
  if (!GUILD_ID) {
    throw new DiscordAPIError(
      "Guild ID not configured",
      500,
      "GUILD_ID_MISSING"
    );
  }

  // Increase max retries to allow multiple attempts
  const response = await fetchWithRetry(
    `${DISCORD_API_URL}/users/@me/guilds/${GUILD_ID}/member`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    5 // Maximum 5 retries
  );

  if (!response.ok) {
    // If user is not in the guild
    if (response.status === 404) {
      console.warn(`User ${userId} is not a member of guild ${GUILD_ID}`);
      return [];
    }

    const data = await response
      .json()
      .catch(() => ({ error: "Failed to parse error response" }));
    const retryAfter = parseInt(response.headers.get("Retry-After") || "0", 10);

    // If unauthorized, indicate a token issue
    if (response.status === 401) {
      throw new DiscordAPIError(
        "Discord authorization invalid or expired",
        401,
        "TOKEN_INVALID",
        retryAfter
      );
    }

    throw new DiscordAPIError(
      data.error || `Failed to fetch guild roles: ${response.status}`,
      response.status,
      "FETCH_ROLES_FAILED",
      retryAfter
    );
  }

  const guildMember = (await response.json()) as DiscordGuildMember;
  return guildMember.roles || [];
}

// Generate OAuth2 authorization URL
export function getDiscordAuthUrl(code_challenge?: string): string {
  if (!CLIENT_ID) {
    console.error("Discord client ID not configured");
    throw new Error("Discord client ID not configured");
  }

  console.log("Using Discord Client ID:", CLIENT_ID);
  console.log("Using redirect URI:", REDIRECT_URI);

  const scope = "identify guilds guilds.members.read";

  // Basic parameters
  const params: Record<string, string> = {
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: scope,
  };

  // Additional parameters for PKCE
  if (code_challenge) {
    params.code_challenge = code_challenge;
    params.code_challenge_method = "S256";
  }

  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `https://discord.com/api/oauth2/authorize?${queryString}`;
}

// Revoke Discord user token (during logout)
export async function revokeToken(token: string): Promise<boolean> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Discord client credentials not configured");
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    token,
  });

  const response = await fetchWithRetry(
    `${DISCORD_API_URL}/oauth2/token/revoke`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  return response.ok;
}
