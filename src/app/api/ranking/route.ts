import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character, ScoreMember } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const league = request.nextUrl.searchParams.get('league') || 'general';

    console.log(`Fetching rankings for league: ${league}`);

    // Get all characters first to properly filter by league
    const allCharacterKeys = await kv.keys('character:*');
    
    if (!allCharacterKeys || allCharacterKeys.length === 0) {
      console.log('No characters found');
      return NextResponse.json({ rankings: [] });
    }
    
    // Fetch all characters
    const charactersPromises = allCharacterKeys.map(key => 
      kv.hgetall<Character>(key)
    );
    
    const allCharacters = await Promise.all(charactersPromises);
    
    // Filter characters that belong to the requested league
    const leagueCharacters = allCharacters.filter(character => {
      if (!character) return false;
      
      // For 'general' league, include all characters
      if (league === 'general') return true;
      
      // Otherwise, strictly match the requested league
      return character.league === league;
    });
    
    console.log(`Found ${leagueCharacters.length} characters in league ${league}`);
    
    // Sort characters by ELO score (descending)
    leagueCharacters.sort((a, b) => {
      // Type assertion since we've filtered out null values
      const aElo = (a as Character).elo || 0;
      const bElo = (b as Character).elo || 0;
      return bElo - aElo;
    });
    
    // Apply pagination
    const paginatedCharacters = leagueCharacters.slice(offset, offset + limit);
    
    // Format the result with rank information
    const rankings = paginatedCharacters.map((character, index) => {
      if (!character) return null;
      
      return {
        ...character,
        rank: offset + index + 1,
      };
    }).filter(Boolean);
    
    console.log(`Returning ${rankings.length} ranked characters`);
    console.log('First few rankings:', rankings.slice(0, 3).map(r => ({
      id: r.id,
      name: r.name,
      league: r.league,
      rank: r.rank,
      elo: r.elo
    })));

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
