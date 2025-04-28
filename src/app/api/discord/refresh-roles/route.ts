import { NextRequest, NextResponse } from 'next/server';

// Discord API configuration
const DISCORD_API_URL = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// League mappings based on Discord roles (same as in auth route)
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

// In a real implementation, you would fetch the user's tokens from a database
// Here we're using a mock function as placeholder
async function getUserTokens(userId: string) {
  // This is a placeholder - in a real implementation, you would fetch from your database
  // For now, return a mock error to indicate this needs to be properly implemented
  throw new Error('User not found or token expired. Please reconnect with Discord.');
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
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!CLIENT_ID || !CLIENT_SECRET || !GUILD_ID) {
      return NextResponse.json({ error: 'Discord integration is not properly configured' }, { status: 500 });
    }
    
    // In a real implementation, you would:
    // 1. Fetch user's Discord token from your database
    // 2. Check if token is valid/refresh if needed
    // 3. Use token to fetch latest roles
    
    try {
      // This would be replaced with actual database lookup in a real implementation
      const { accessToken, username, discriminator, avatar } = await getUserTokens(userId);
      
      // Fetch user's guild roles
      const guildData = await fetchUserGuildRoles(accessToken, userId);
      
      // Determine user's leagues based on roles
      const userRoles = guildData.roles || [];
      const leagues = determineUserLeagues(userRoles);
      const primaryLeague = getPrimaryLeague(leagues);
      
      // Prepare user data for response
      const responseData = {
        id: userId,
        username,
        discriminator,
        avatar,
        roles: userRoles,
        leagues,
        primaryLeague,
      };
      
      // In a real implementation, you would also update this information in your database
      
      return NextResponse.json(responseData);
      
    } catch (error) {
      // For demo purposes, return a mock response since we don't have a real database
      // In a real implementation, this would be an error
      
      const mockRoles = ['123456789123456789', '345678901345678901']; // Example mock roles
      const leagues = determineUserLeagues(mockRoles);
      const primaryLeague = getPrimaryLeague(leagues);
      
      const mockUser = {
        id: userId,
        username: 'MockUser',
        discriminator: '0000',
        avatar: null,
        roles: mockRoles,
        leagues,
        primaryLeague,
      };
      
      return NextResponse.json(mockUser);
    }
    
  } catch (error) {
    console.error('Discord role refresh error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh Discord roles' },
      { status: 500 }
    );
  }
}
