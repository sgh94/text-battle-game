import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { Character } from '@/types';

// Mock database for local development (when KV is not available)
const mockCharacterDb = new Map<string, Character>();
const mockUserCharacterIds = new Map<string, string[]>();
const mockCharacterRankings = new Map<string, number>();

// Create a new character
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userAddress = authResult.address;
    const requestData = await request.json();
    const name = requestData?.name as string;
    const traits = requestData?.traits as string;

    // Basic validation
    if (!name || !traits) {
      return NextResponse.json({ error: 'Name and traits are required' }, { status: 400 });
    }

    // Get user's existing characters
    let characterIds: string[] = [];

    try {
      const characterIdsResponse = await kv.smembers(`user:${userAddress}:characters`);
      // Ensure characterIds is an array
      characterIds = Array.isArray(characterIdsResponse) ? characterIdsResponse : [characterIdsResponse].filter(Boolean);
    } catch (kvError) {
      console.warn('KV database error on fetching character IDs, using mock database:', kvError);
      // Fall back to mock database
      characterIds = mockUserCharacterIds.get(userAddress) || [];
    }

    // Check if user already has 5 characters
    if (characterIds.length >= 5) {
      return NextResponse.json(
        { error: 'Maximum number of characters (5) reached' },
        { status: 400 }
      );
    }

    // Create unique character ID
    const characterId = `${userAddress}_${Date.now()}`;

    // Set initial ELO score
    const defaultElo = 1000;

    const character: Character = {
      id: characterId,
      owner: userAddress,
      name,
      traits,
      elo: defaultElo,
      wins: 0,
      losses: 0,
      draws: 0,
      createdAt: Date.now(),
    };

    try {
      // Save character data to KV
      await kv.hset(`character:${characterId}`, character as Record<string, unknown>);
      // Add character to user's character list
      await kv.sadd(`user:${userAddress}:characters`, characterId);
      // Add character to the global ranking set with ELO as score
      await kv.zadd('characters:ranking', { score: defaultElo, member: characterId });
    } catch (kvError) {
      console.warn('KV database error on character creation, using mock database:', kvError);
      // Fall back to mock database
      mockCharacterDb.set(characterId, character);
      
      const userCharacters = mockUserCharacterIds.get(userAddress) || [];
      userCharacters.push(characterId);
      mockUserCharacterIds.set(userAddress, userCharacters);
      
      mockCharacterRankings.set(characterId, defaultElo);
    }

    return NextResponse.json({ success: true, character });
  } catch (error) {
    console.error('Error creating character:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get characters for user
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

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
      console.warn('KV database error on fetching character IDs, using mock database:', kvError);
      // Fall back to mock database
      characterIds = mockUserCharacterIds.get(lowerCaseAddress) || [];
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
          console.warn(`KV database error on fetching character ${id}, using mock database:`, kvError);
          // Fall back to mock database
          character = mockCharacterDb.get(id) || null;
        }
        
        return character;
      })
    );

    return NextResponse.json({ characters: characters.filter((char): char is Character => char !== null) });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
