import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { Character } from '@/types';
import { getDiscordUser } from '@/lib/db';

// Create a new character
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      console.error('Authentication failed:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userAddress = authResult.address;
    const requestData = await request.json();
    const name = requestData?.name as string;
    const traits = requestData?.traits as string;
    const userId = requestData?.userId; // This is Discord user ID
    const league = requestData?.league || 'general'; // Default league if not specified
    
    // Enhanced logging
    console.log('Character creation request:', {
      userAddress,
      userId,
      name: name?.substring(0, 20),
      league,
    });
    
    // Basic validation
    if (!name || !traits) {
      return NextResponse.json({ error: 'Name and traits are required' }, { status: 400 });
    }

    // Determine which ID to use (Discord user ID preferred over address from auth)
    const characterOwner = userId || userAddress;
    
    if (!characterOwner) {
      return NextResponse.json({ error: 'User identification failed' }, { status: 400 });
    }

    // Get user's Discord data to verify league access
    let userLeagues = ['general']; // Default (changed from 'bronze' for consistency)
    let discordUser = null;
    
    if (userId) {
      try {
        discordUser = await getDiscordUser(userId);
        if (discordUser && discordUser.leagues) {
          userLeagues = discordUser.leagues;
          console.log(`User ${userId} has leagues:`, userLeagues);
        } else {
          console.warn(`No leagues found for user ${userId}`);
        }
      } catch (error) {
        console.error('Error fetching Discord user:', error);
        return NextResponse.json(
          { error: 'Failed to verify Discord user information' },
          { status: 500 }
        );
      }
    }

    // Always allow access to the general league
    if (league !== 'general' && !userLeagues.includes(league)) {
      return NextResponse.json(
        { 
          error: `You do not have access to the ${league} league. Available leagues: ${userLeagues.join(', ')}` 
        },
        { status: 403 }
      );
    }

    // Get user's existing characters
    let characterIds: string[] = [];

    try {
      const characterIdsResponse = await kv.smembers(`user:${characterOwner}:characters`);
      // Ensure characterIds is an array
      characterIds = Array.isArray(characterIdsResponse) ? characterIdsResponse : [characterIdsResponse].filter(Boolean);
      console.log(`Found ${characterIds.length} existing characters for ${characterOwner}`);
    } catch (kvError) {
      console.warn('KV database error on fetching character IDs', kvError);
    }

    // Check if the user already has a character in this league
    if (characterIds.length > 0) {
      try {
        // Get all characters to check their leagues
        const characters = await Promise.all(
          characterIds.map(async (id) => {
            return await kv.hgetall<Character>(`character:${id}`);
          })
        );
        
        // Filter out null values
        const userCharacters = characters.filter((char): char is Character => char !== null);
        
        // Check if user already has a character in this league
        const existingCharacterInLeague = userCharacters.find(char => char.league === league);
        
        if (existingCharacterInLeague) {
          return NextResponse.json(
            { error: `You already have a character in the ${league} league. Only one character per league is allowed.` },
            { status: 400 }
          );
        }
      } catch (error) {
        console.error('Error checking existing characters:', error);
        return NextResponse.json(
          { error: 'Failed to verify existing characters' },
          { status: 500 }
        );
      }
    }

    // Create unique character ID
    const characterId = `${characterOwner}_${Date.now()}`;

    // Set initial ELO score
    const defaultElo = 1000;

    const character: Character = {
      id: characterId,
      owner: characterOwner,
      name,
      traits,
      elo: defaultElo,
      wins: 0,
      losses: 0,
      draws: 0,
      league: league, // Store the league
      createdAt: Date.now(),
    };

    try {
      // Save character data to KV
      await kv.hset(`character:${characterId}`, character as Record<string, unknown>);
      // Add character to user's character list
      await kv.sadd(`user:${characterOwner}:characters`, characterId);
      // Add character to the global ranking set with ELO as score
      await kv.zadd('characters:ranking', { score: defaultElo, member: characterId });
      // Add character to the league-specific ranking
      await kv.zadd(`league:${league}:ranking`, { score: defaultElo, member: characterId });
      
      console.log(`Character created successfully: ${characterId} for owner ${characterOwner} in league ${league}`);
    } catch (kvError) {
      console.error('KV database error on character creation', kvError);
      return NextResponse.json(
        { error: 'Database error while creating character' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, character });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get characters for user
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');
    const league = request.nextUrl.searchParams.get('league');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const lowerCaseAddress = address.toLowerCase();
    let characterIds: string[] = [];

    try {
      const characterIdsResponse = await kv.smembers(`user:${lowerCaseAddress}:characters`);
      // Ensure characterIds is an array
      characterIds = Array.isArray(characterIdsResponse) ? characterIdsResponse : [characterIdsResponse].filter(Boolean);
    } catch (kvError) {
      console.warn('KV database error on fetching character IDs', kvError);
    }

    if (!characterIds || characterIds.length === 0) {
      return NextResponse.json({ characters: [] });
    }

    // Fetch all characters in parallel
    const characters = await Promise.all(
      characterIds.map(async (id: string) => {
        let character: Character | null = null;

        try {
          character = await kv.hgetall<Character>(`character:${id}`);
        } catch (kvError) {
          console.warn(`KV database error on fetching character ${id}`, kvError);
        }

        return character;
      })
    );

    // Filter by league if specified
    let filteredCharacters = characters.filter((char): char is Character => char !== null);
    
    if (league) {
      filteredCharacters = filteredCharacters.filter(char => char.league === league);
    }

    return NextResponse.json({ characters: filteredCharacters });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
