import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character } from '@/types';

// Mock database for local development (when KV is not available)
// Using the same mock DB variables from the character route
const mockCharacterDb = new Map<string, Character>();
const mockUserCharacterIds = new Map<string, string[]>();
const mockCharacterRankings = new Map<string, number>();

// Seed AI character (only available in development mode)
export async function POST(request: NextRequest) {
  // Security checks
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  try {
    // Get character data from request
    const character = await request.json() as Character;
    
    // Validate required fields
    if (!character.id || !character.owner || !character.name || !character.traits) {
      return NextResponse.json(
        { error: 'Missing required character fields' },
        { status: 400 }
      );
    }
    
    try {
      // Try to save to KV
      await kv.hset(`character:${character.id}`, character as Record<string, unknown>);
      
      // Add character to AI user's character list
      await kv.sadd(`user:${character.owner}:characters`, character.id);
      
      // Add character to the global ranking set with ELO as score
      await kv.zadd('characters:ranking', { score: character.elo, member: character.id });
      
      // Also add to mock DB for local fallback
      mockCharacterDb.set(character.id, character);
      
      const userCharacters = mockUserCharacterIds.get(character.owner) || [];
      if (!userCharacters.includes(character.id)) {
        userCharacters.push(character.id);
        mockUserCharacterIds.set(character.owner, userCharacters);
      }
      
      mockCharacterRankings.set(character.id, character.elo);
      
    } catch (kvError) {
      console.warn('KV database error on seeding character, using mock database:', kvError);
      
      // Fall back to mock database only
      mockCharacterDb.set(character.id, character);
      
      const userCharacters = mockUserCharacterIds.get(character.owner) || [];
      if (!userCharacters.includes(character.id)) {
        userCharacters.push(character.id);
        mockUserCharacterIds.set(character.owner, userCharacters);
      }
      
      mockCharacterRankings.set(character.id, character.elo);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `AI character '${character.name}' has been seeded`,
      character
    });
    
  } catch (error) {
    console.error('Error seeding character:', error);
    return NextResponse.json(
      { error: 'Internal server error during character seeding' },
      { status: 500 }
    );
  }
}

// Get all seeded AI characters
export async function GET(request: NextRequest) {
  // Security checks
  const isDev = process.env.NODE_ENV === 'development';
  
  if (!isDev) {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  const AI_BASE_ADDRESS = '0xAI00000000000000000000000000000000000000';
  
  try {
    let characterIds: string[] = [];
    
    try {
      const characterIdsResponse = await kv.smembers(`user:${AI_BASE_ADDRESS}:characters`);
      // Ensure characterIds is an array
      characterIds = Array.isArray(characterIdsResponse) ? characterIdsResponse : [characterIdsResponse].filter(Boolean);
    } catch (kvError) {
      console.warn('KV database error on fetching AI character IDs, using mock database:', kvError);
      // Fall back to mock database
      characterIds = mockUserCharacterIds.get(AI_BASE_ADDRESS) || [];
    }
    
    if (!characterIds || characterIds.length === 0) {
      return NextResponse.json({ characters: [] });
    }
    
    // Fetch all AI characters in parallel
    const characters = await Promise.all(
      characterIds.map(async (id: string) => {
        let character: Character | null = null;
        
        try {
          character = await kv.hgetall<Character>(`character:${id}`);
        } catch (kvError) {
          console.warn(`KV database error on fetching AI character ${id}, using mock database:`, kvError);
          // Fall back to mock database
          character = mockCharacterDb.get(id) || null;
        }
        
        return character;
      })
    );
    
    return NextResponse.json({ 
      characters: characters.filter((char): char is Character => char !== null),
      count: characters.filter((char): char is Character => char !== null).length
    });
    
  } catch (error) {
    console.error('Error fetching AI characters:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching AI characters' },
      { status: 500 }
    );
  }
}
