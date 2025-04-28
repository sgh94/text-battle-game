import { NextRequest, NextResponse } from 'next/server';

// Discord API configuration
const DISCORD_API_URL = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${process.env.VERCEL_URL || 'http://localhost:3000'}/auth/callback`;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// League mappings based on Discord roles
const ROLE_TO_LEAGUE_MAP: Record<string, string> = {
  // Sample mapping - replace with actual Discord role IDs from your server
  '123456789123456789': 'bronze',
  '234567890234567890': 'silver',
  '345678901345678901': 'gold',
  '456789012456789012': 'platinum',
};

// Special roles that grant access to multiple leagues
const SPECIAL_ROLES: Record<string, string[]> = {
  '567890123567890123': ['gold', 'platinum'],
  '678901234678901234': ['silver', 'gold'],
};

// Exchange authorization code for access token
async function exchangeCodeForToken(code: string) {
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
    body: params,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
    throw new Error(errorData.error || `Failed to exchange code for token: ${response.status}`);
  }

  return response.json();
}

// Fetch user information from Discord API
async function fetchDiscordUser(accessToken: string) {
  const response = await fetch(`${DISCORD_API_URL}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user information: ${response.status}`);
  }

  return response.json();
}

// Fetch user's roles from Discord guild
async function fetchUserGuildRoles(accessToken: string, userId: string) {
  const response = await fetch(`${DISCORD_API_URL}/users/@me/guilds/${GUILD_ID}/member`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    // If user is not in the guild, return empty roles
    if (response.status === 404) {
      return { roles: [] };
    }
    throw new Error(`Failed to fetch guild roles: ${response.status}`);
  }

  return response.json();
}

// Determine leagues based on Discord roles
function determineUserLeagues(roles: string[]) {
  const leagues = new Set<string>();
  
  // Always add bronze league as default
  leagues.add('bronze');
  
  // Check role mappings
  roles.forEach(roleId => {
    const league = ROLE_TO_LEAGUE_MAP[roleId];
    if (league) {
      leagues.add(league);
    }
    
    // Check special roles
    const specialLeagues = SPECIAL_ROLES[roleId];
    if (specialLeagues) {
      specialLeagues.forEach(league => leagues.add(league));
    }
  });
  
  return Array.from(leagues);
}

// Get the highest priority league
function getPrimaryLeague(leagues: string[]) {
  // League priority order
  const leaguePriority = ['platinum', 'gold', 'silver', 'bronze'];
  
  for (const league of leaguePriority) {
    if (leagues.includes(league)) {
      return league;
    }
  }
  
  return 'bronze'; // Default league
}

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
    if (!code) {
      return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
    }
    
    if (!CLIENT_ID || !CLIENT_SECRET || !GUILD_ID) {
      return NextResponse.json({ error: 'Discord integration is not properly configured' }, { status: 500 });
    }
    
    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);
    
    // Fetch user profile
    const userData = await fetchDiscordUser(tokenData.access_token);
    
    // Fetch user's guild roles
    const guildData = await fetchUserGuildRoles(tokenData.access_token, userData.id);
    
    // Determine user's leagues based on roles
    const userRoles = guildData.roles || [];
    const leagues = determineUserLeagues(userRoles);
    const primaryLeague = getPrimaryLeague(leagues);
    
    // Prepare user data for response (excluding sensitive token information)
    const responseData = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator,
      avatar: userData.avatar,
      roles: userRoles,
      leagues,
      primaryLeague,
    };
    
    // In a real implementation, you would also store this information in your database
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Discord authentication error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to authenticate with Discord' },
      { status: 500 }
    );
  }
}
