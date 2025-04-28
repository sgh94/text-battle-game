import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character, UserRanking } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const league = request.nextUrl.searchParams.get('league') || 'bronze';

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get the user's characters
    const characterIds = await kv.smembers(`user:${userId}:characters`);

    if (!characterIds || characterIds.length === 0) {
      return NextResponse.json({ ranking: null });
    }

    // Get all characters for this user
    const characters: Character[] = [];
    for (const id of characterIds) {
      const character = await kv.hgetall<Character>(`character:${id}`);
      if (character && (!character.league || character.league === league)) {
        characters.push(character);
      }
    }

    if (characters.length === 0) {
      return NextResponse.json({ ranking: null });
    }

    // Find the highest ranking character for this user in the specified league
    let highestRankedCharacter: Character | null = null;
    let highestRank = -1;
    let highestElo = -1;

    // Get the ranking for the specified league
    const rankingKey = `league:${league}:ranking`;
    const exists = await kv.exists(rankingKey);

    if (!exists) {
      return NextResponse.json({ ranking: null });
    }

    // For each character, find its rank in the specified league
    for (const character of characters) {
      // Get the character's rank in the league
      // Get the character's rank in the league
      const rank = await kv.zrevrank(rankingKey, character.id);

      if (rank === null) continue;

      // Get the character's score (ELO)
      const elo = await kv.zscore(rankingKey, character.id);
      // Check if this is the highest ranked character for this user
      if (highestRankedCharacter === null || rank < highestRank) {
        highestRankedCharacter = character;
        highestRank = rank;
        highestElo = elo || 0;
      }
    }

    if (!highestRankedCharacter) {
      return NextResponse.json({ ranking: null });
    }

    // Return the user's ranking
    const userRanking: UserRanking = {
      characterId: highestRankedCharacter.id,
      characterName: highestRankedCharacter.name,
      rank: highestRank + 1, // Convert from 0-based to 1-based rank
      elo: highestElo
    };

    return NextResponse.json({ ranking: userRanking });
  } catch (error) {
    console.error('Error fetching user ranking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
