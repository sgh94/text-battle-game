import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCodeForToken,
  fetchDiscordUser,
  fetchUserGuildRoles,
  DiscordAPIError
} from '@/lib/discord-api';
import { DiscordUser, saveDiscordToken, saveDiscordUser } from '@/lib/db';
import { determineUserLeagues, getPrimaryLeague } from '@/lib/discord-roles';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { code, codeVerifier } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code provided' },
        { status: 400 }
      );
    }

    // Check required environment variables
    if (!process.env.DISCORD_CLIENT_ID ||
      !process.env.DISCORD_CLIENT_SECRET ||
      !process.env.DISCORD_GUILD_ID) {
      console.error('Missing required environment variables for Discord integration');
      return NextResponse.json(
        { error: 'Discord integration is not properly configured' },
        { status: 500 }
      );
    }

    console.log('Processing Discord authentication with code:', code.substring(0, 10) + '...');
    console.log('Code verifier:', codeVerifier ? `present (${codeVerifier.length} chars)` : 'not provided');

    // 1. Exchange code for access token (including PKCE code verifier)
    const tokenData = await exchangeCodeForToken(code, codeVerifier);
    console.log('Token exchange successful');

    // 2. Get Discord user information
    const userData = await fetchDiscordUser(tokenData.access_token);
    console.log('User info retrieved for:', userData.username);

    // 3. Get user's guild roles
    const userRoles = await fetchUserGuildRoles(tokenData.access_token, userData.id);
    console.log('User has', userRoles.length, 'roles');

    // 4. Determine leagues based on roles
    const leagues = determineUserLeagues(userRoles);
    const primaryLeague = getPrimaryLeague(leagues);
    console.log('User leagues:', leagues);
    console.log('Primary league:', primaryLeague);

    // 5. Save token information (database)
    await saveDiscordToken(userData.id, tokenData);

    // 6. Save user information (database)
    const userProfile = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0',
      avatar: userData.avatar,
      roles: userRoles,
      leagues,
      primaryLeague,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveDiscordUser(userProfile as DiscordUser);
    console.log('User data saved successfully');

    // 7. Respond to client (excluding sensitive token information)
    const responseData = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0',
      avatar: userData.avatar,
      roles: userRoles,
      leagues,
      primaryLeague,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Discord authentication error:', error);

    // Handle Discord API errors
    if (error instanceof DiscordAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    // Handle other errors
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to authenticate with Discord',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
