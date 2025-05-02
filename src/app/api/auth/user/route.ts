import { NextRequest, NextResponse } from 'next/server';
import { fetchDiscordUser, fetchUserGuildRoles, DiscordAPIError } from '@/lib/discord-api';
import { determineUserLeagues, getPrimaryLeague } from '@/lib/discord-roles';
import { saveDiscordUser, getDiscordUser, DiscordUser } from '@/lib/db';

// Server-side API request tracking - prevent duplicate requests
const requestCounts: Record<string, number> = {};
const lastRequestTimes: Record<string, number> = {};

// Request limit settings
const MIN_REQUEST_INTERVAL = 5000; // Prevent re-requests with the same token within 5 seconds

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const tokenKey = token.substring(0, 20); // Token identifier

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    // Check for duplicate requests and API request rate limiting
    const now = Date.now();
    const lastRequestTime = lastRequestTimes[tokenKey] || 0;

    // If called continuously at too fast a rate
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
      requestCounts[tokenKey] = (requestCounts[tokenKey] || 0) + 1;

      // If too many consecutive requests, apply rate limiting
      if (requestCounts[tokenKey] > 3) {
        const waitSeconds = Math.ceil(MIN_REQUEST_INTERVAL / 1000);
        console.log(`Rate limiting user request, too many requests in short time`);

        return NextResponse.json(
          {
            error: `Too many requests. Please wait ${waitSeconds} seconds.`,
            code: 'TOO_MANY_REQUESTS'
          },
          {
            status: 429,
            headers: {
              'Retry-After': `${waitSeconds}`
            }
          }
        );
      }

      // Add cache headers to encourage response reuse
      console.log('Recent request detected, returning cached response');
      return NextResponse.json(
        {
          message: 'Please use cached response',
          cacheTime: lastRequestTime
        },
        {
          status: 200,
          headers: {
            'Cache-Control': 'max-age=5',
          }
        }
      );
    }

    // Reset count if it's the first request with this token or sufficient time has passed
    requestCounts[tokenKey] = 0;
    lastRequestTimes[tokenKey] = now;

    console.log('Fetching Discord user info with token');

    // Get user information
    const userData = await fetchDiscordUser(token);

    // Get user's guild roles
    let userRoles: string[] = [];
    try {
      userRoles = await fetchUserGuildRoles(token, userData.id);
      console.log('User has', userRoles.length, 'Discord roles');
    } catch (error) {
      console.error('Error fetching guild roles:', error);
      // Continue with empty array if role fetching fails
      userRoles = [];
    }

    // Determine leagues based on roles
    const leagues = determineUserLeagues(userRoles);
    const primaryLeague = getPrimaryLeague(leagues);

    // Check if user already exists in database
    const existingUser = await getDiscordUser(userData.id);

    // If user doesn't exist or roles have changed, save to database
    if (!existingUser || JSON.stringify(existingUser.roles) !== JSON.stringify(userRoles)) {
      console.log(`Saving Discord user ${userData.id} (${userData.username}) to database`);

      const userToSave: DiscordUser = {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator || '0',
        avatar: userData.avatar,
        roles: userRoles,
        leagues,
        primaryLeague: primaryLeague || '',
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const saveResult = await saveDiscordUser(userToSave);
      if (!saveResult) {
        console.error(`Failed to save Discord user ${userData.id} to database`);
      } else {
        console.log(`Successfully saved Discord user ${userData.id} to database`);
      }
    }

    // Prepare response data
    const responseData = {
      id: userData.id,
      username: userData.username,
      discriminator: userData.discriminator || '0',
      avatar: userData.avatar,
      roles: userRoles,
      leagues,
      primaryLeague,
    };

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Allow caching for 5 minutes
      }
    });

  } catch (error) {
    console.error('Error processing user request:', error);

    // Handle Discord API errors
    if (error instanceof DiscordAPIError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }

    // General errors
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch user data',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}