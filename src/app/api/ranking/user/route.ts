import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character, UserRanking } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const league = request.nextUrl.searchParams.get('league') || 'general';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    console.log(`Fetching user ranking for userId: ${userId} in league: ${league}`);

    // Get the user's characters
    const characterIds = await kv.smembers(`user:${userId}:characters`);

    if (!characterIds || characterIds.length === 0) {
      console.log(`No characters found for user: ${userId}`);
      return NextResponse.json({ ranking: null });
    }

    console.log(`Found ${characterIds.length} characters for user: ${userId}`);

    // Get all characters for this user
    const characters: Character[] = [];
    for (const id of characterIds) {
      const character = await kv.hgetall<Character>(`character:${id}`);
      
      // Character must be in the correct league unless it's the general league
      if (character) {
        // If league is general, include all characters
        // Otherwise, only include characters that match the requested league
        if (league === 'general' || character.league === league) {
          characters.push(character);
          console.log(`Including character: ${character.name} (ID: ${character.id}) in league: ${character.league}`);
        } else {
          console.log(`Skipping character: ${character.name} (ID: ${character.id}) in league: ${character.league}, requested: ${league}`);
        }
      }
    }

    if (characters.length === 0) {
      console.log(`No characters in league: ${league} for user: ${userId}`);
      return NextResponse.json({ ranking: null });
    }

    // Find the highest ranking character for this user in the specified league
    let highestRankedCharacter: Character | null = null;
    let highestRank = Infinity;
    let highestElo = -1;

    // Get the ranking for the specified league
    const rankingKey = `league:${league}:ranking`;
    const exists = await kv.exists(rankingKey);

    if (!exists) {
      console.log(`Ranking key ${rankingKey} does not exist`);
      return NextResponse.json({ ranking: null });
    }

    // For each character, find its rank in the specified league
    for (const character of characters) {
      // Get the character's rank in the league
      const rank = await kv.zrevrank(rankingKey, character.id);

      if (rank === null) {
        console.log(`Character ${character.id} (${character.name}) not found in ranking for league: ${league}`);
        continue;
      }

      // Get the character's score (ELO)
      const elo = await kv.zscore(rankingKey, character.id);
      
      console.log(`Character ${character.name} (ID: ${character.id}) has rank: ${rank + 1}, elo: ${elo}`);
      
      // Check if this is the highest ranked character for this user
      if (highestRankedCharacter === null || rank < highestRank) {
        highestRankedCharacter = character;
        highestRank = rank;
        highestElo = elo || 0;
      }
    }

    if (!highestRankedCharacter) {
      console.log(`No ranked character found for user: ${userId} in league: ${league}`);
      return NextResponse.json({ ranking: null });
    }

    // Return the user's ranking
    const userRanking: UserRanking = {
      characterId: highestRankedCharacter.id,
      characterName: highestRankedCharacter.name,
      rank: highestRank + 1, // Convert from 0-based to 1-based rank
      elo: highestElo
    };

    console.log(`User ranking for ${userId} in league ${league}:`, userRanking);
    return NextResponse.json({ ranking: userRanking });
  } catch (error) {
    console.error('Error fetching user ranking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
