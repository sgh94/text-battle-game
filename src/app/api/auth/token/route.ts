import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, fetchDiscordUser, fetchUserGuildRoles, DiscordAPIError } from '@/lib/discord-api';
import { determineUserLeagues, getPrimaryLeague } from '@/lib/discord-roles';
import { saveDiscordUser, saveDiscordToken, DiscordUser } from '@/lib/db';

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

    console.log('Token exchange request received:');
    console.log('- Code:', code ? `${code.substring(0, 10)}...` : 'missing');
    console.log('- Code verifier:', codeVerifier ? `present (${codeVerifier.length} chars)` : 'missing');

    // Environment variables verification
    if (!process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID) {
      console.error('Discord client ID not configured');
      return NextResponse.json(
        { error: 'Discord client ID not configured', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    if (!process.env.DISCORD_CLIENT_SECRET) {
      console.error('Discord client secret not configured');
      return NextResponse.json(
        { error: 'Discord client secret not configured', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    // Exchange authorization code for access token (including PKCE code verifier)
    const tokenData = await exchangeCodeForToken(code, codeVerifier);
    console.log('Token exchange successful');

    // CRITICAL: Immediately fetch and save user data to ensure database has user record
    try {
      // Fetch user info using the new token
      const userData = await fetchDiscordUser(tokenData.access_token);
      console.log(`Fetched user info for: ${userData.username} (${userData.id})`);

      // Save token to database
      await saveDiscordToken(userData.id, tokenData);
      console.log(`Saved token for user ${userData.id}`);

      // Fetch user's guild roles
      let userRoles: string[] = [];
      try {
        userRoles = await fetchUserGuildRoles(tokenData.access_token, userData.id);
        console.log(`Fetched ${userRoles.length} roles for user ${userData.id}`);
      } catch (roleError) {
        console.error('Error fetching guild roles:', roleError);
        // Continue with empty roles array
      }

      // Determine leagues based on roles
      const leagues = determineUserLeagues(userRoles);
      const primaryLeague = getPrimaryLeague(leagues);

      // Create user object for database
      const userToSave: DiscordUser = {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator || '0',
        avatar: userData.avatar,
        roles: userRoles,
        leagues,
        primaryLeague: primaryLeague || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save user to database
      const saveResult = await saveDiscordUser(userToSave);
      if (saveResult) {
        console.log(`Successfully saved user ${userData.id} to database`);
      } else {
        console.error(`Failed to save user ${userData.id} to database`);
      }

    } catch (userError) {
      console.error('Error fetching/saving user data during token exchange:', userError);
      // Continue with token response even if user data saving fails
    }

    return NextResponse.json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);

    // Discord API error handling
    if (error instanceof DiscordAPIError) {
      // Special handling for rate limiting
      if (error.status === 429 && error.retryAfter) {
        return NextResponse.json(
          { error: 'Rate limited by Discord, please try again later', code: 'RATE_LIMITED' },
          {
            status: 429,
            headers: {
              'Retry-After': String(error.retryAfter)
            }
          }
        );
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    // Network error handling
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          error: 'Network error when connecting to Discord. Please check your internet connection.',
          code: 'NETWORK_ERROR'
        },
        { status: 503 }
      );
    }

    // Other error handling
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to exchange token',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}