import { NextRequest, NextResponse } from 'next/server';
import {
  getValidAccessToken,
  fetchUserGuildRoles,
  fetchDiscordUser,
  DiscordAPIError
} from '@/lib/discord-api';
import {
  getDiscordUser,
  updateUserRoles
} from '@/lib/db';
import {
  determineUserLeagues,
  getPrimaryLeague
} from '@/lib/discord-roles';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log(`Refreshing roles for user: ${userId}`);

    // 1. Retrieve user information from database
    const userProfile = await getDiscordUser(userId);

    if (!userProfile) {
      console.error(`User not found: ${userId}`);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    try {
      // 2. Get valid access token (auto-refresh if needed)
      console.log(`Getting valid access token for user: ${userId}`);
      const accessToken = await getValidAccessToken(userId);

      // 3. Get latest role information through Discord API
      console.log(`Fetching guild roles for user: ${userId}`);
      const updatedRoles = await fetchUserGuildRoles(accessToken, userId);
      console.log(`User ${userId} has ${updatedRoles.length} roles`);

      // 4. Calculate leagues based on roles
      const leagues = determineUserLeagues(updatedRoles);
      const primaryLeague = getPrimaryLeague(leagues);
      console.log(`User ${userId} leagues: ${leagues.join(', ')}, primary: ${primaryLeague}`);

      // 5. Update user roles and league information in database
      await updateUserRoles(userId, updatedRoles, leagues, primaryLeague || '');
      console.log(`Updated roles for user ${userId} successfully`);

      // 6. Return updated user information
      const updatedUserProfile = {
        ...userProfile,
        roles: updatedRoles,
        leagues,
        primaryLeague,
        updatedAt: new Date().toISOString(),
      };

      return NextResponse.json(updatedUserProfile);

    } catch (error) {
      // Generate a detailed error message
      let errorMessage = 'Unknown error during role refresh';
      let errorCode = 'UNKNOWN_ERROR';
      let status = 500;

      if (error instanceof DiscordAPIError) {
        errorMessage = error.message;
        errorCode = error.code;
        status = error.status;

        console.error(`Discord API Error: ${errorCode}, ${errorMessage}, Status: ${status}`);

        // If token is expired or refresh failed
        if (error.code === 'TOKEN_NOT_FOUND' || error.code === 'TOKEN_REFRESH_FAILED' || error.code === 'TOKEN_INVALID') {
          return NextResponse.json(
            {
              error: 'Authentication expired. Please log in again.',
              code: 'AUTH_EXPIRED'
            },
            { status: 401 }
          );
        }

        // Guild membership error (e.g., user not in server)
        if (error.code === 'FETCH_ROLES_FAILED') {
          console.log(`User ${userId} is not in the guild or roles fetch failed, setting default leagues`);
          // Set default leagues if user is not in server or has no roles
          const defaultRoles: string[] = [];
          const leagues = determineUserLeagues(defaultRoles);
          const primaryLeague = getPrimaryLeague(leagues);

          try {
            // Update database with default roles and league information
            await updateUserRoles(userId, defaultRoles, leagues, primaryLeague || '');
            console.log(`Updated user ${userId} with default roles successfully`);

            const updatedUserProfile = {
              ...userProfile,
              roles: defaultRoles,
              leagues,
              primaryLeague,
              updatedAt: new Date().toISOString(),
            };

            return NextResponse.json(updatedUserProfile);
          } catch (dbError) {
            console.error(`Failed to update user ${userId} with default roles:`, dbError);
            // Continue to error response
          }
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`General Error during role refresh: ${errorMessage}`);
      } else {
        console.error(`Unexpected error type during role refresh:`, error);
      }

      // Return a detailed error response
      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
          userId
        },
        { status }
      );
    }

  } catch (error) {
    console.error('Discord role refresh request processing error:', error);

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
        error: error instanceof Error ? error.message : 'Failed to refresh Discord roles',
        code: 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}
