import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { Character } from '@/types';

// Create a new character
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userAddress = authResult.address;
    const { name, traits } = await request.json();

    // Basic validation
    if (!name || !traits) {
      return NextResponse.json({ error: 'Name and traits are required' }, { status: 400 });
    }

    // Get user's existing characters
    const characterIdsResponse = await kv.smembers(`user:${userAddress}:characters`);
    // Ensure characterIds is an array
    const characterIds = Array.isArray(characterIdsResponse) ? characterIdsResponse : [characterIdsResponse].filter(Boolean);
    
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

    // Save character data
    await kv.hset(`character:${characterId}`, character as Record<string, unknown>);
    
    // Add character to user's character list
    await kv.sadd(`user:${userAddress}:characters`, characterId);

    // Add character to the global ranking set with ELO as score
    await kv.zadd('characters:ranking', { score: defaultElo, member: characterId });

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

    const characterIdsResponse = await kv.smembers(`user:${address.toLowerCase()}:characters`);
    // Ensure characterIds is an array
    const characterIds = Array.isArray(characterIdsResponse) ? characterIdsResponse : [characterIdsResponse].filter(Boolean);
    
    if (!characterIds || characterIds.length === 0) {
      return NextResponse.json({ characters: [] });
    }

    // Fetch all characters in parallel
    const characters = await Promise.all(
      characterIds.map(async (id: string) => {
        const character = await kv.hgetall<Character>(`character:${id}`);
        return character;
      })
    );

    return NextResponse.json({ characters: characters.filter((char): char is Character => char !== null) });
  } catch (error) {
    console.error('Error fetching characters:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
