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

    // 1. Check the ranking key for the specified league
    const rankingKey = `league:${league}:ranking`;
    const exists = await kv.exists(rankingKey);
    if (!exists) {
      console.log(`Ranking key ${rankingKey} does not exist`);
      return NextResponse.json({ ranking: null });
    }

    // 2. Get the list of character IDs for the user
    const characterIds = await kv.smembers(`user:${userId}:characters`);
    if (!characterIds || characterIds.length === 0) {
      console.log(`No characters found for user: ${userId}`);
      return NextResponse.json({ ranking: null });
    }

    console.log(`User ${userId} has ${characterIds.length} characters`);

    // 3. Filter characters by league (each league is independent)
    const characterPromises = characterIds.map(id =>
      kv.hgetall<Character>(`character:${id}`)
    );

    const characters = await Promise.all(characterPromises);

    // Select only characters that exactly match the requested league
    const validCharacterIds = characterIds.filter((id, index) => {
      const character = characters[index];
      // Include only characters that exactly match the league (general is also an independent league)
      return character && character.league === league;
    });

    console.log(`User ${userId} has ${validCharacterIds.length} characters in ${league} league`);

    if (validCharacterIds.length === 0) {
      return NextResponse.json({ ranking: null });
    }

    // 4. Get ranking information for each character
    let bestRank = Infinity;
    let bestCharacterId = null;
    let bestElo = -1;
    let bestCharacterName = '';

    // Check ranking for each character
    for (const id of validCharacterIds) {
      // Get character's ranking position (0-based)
      const rank = await kv.zrevrank(rankingKey, id);

      if (rank === null) continue; // Character not in ranking

      // Get character's ELO score
      const elo = await kv.zscore(rankingKey, id);

      // Get character information
      const character = await kv.hgetall<Character>(`character:${id}`);

      if (!character) continue;

      console.log(`Character ${id} (${character.name}) has rank #${rank + 1} with elo ${elo}`);

      // Update if higher ranking (lower number)
      if (rank < bestRank) {
        bestRank = rank;
        bestCharacterId = id;
        bestElo = elo || 0;
        bestCharacterName = character.name || '';
      }
    }

    // 5. Return the highest ranking character result
    if (bestCharacterId) {
      const userRanking = {
        characterId: bestCharacterId,
        characterName: bestCharacterName,
        rank: bestRank + 1, // Convert from 0-based to 1-based
        elo: bestElo
      };

      return NextResponse.json({ ranking: userRanking });
    }

    return NextResponse.json({ ranking: null });
  } catch (error) {
    console.error('Error fetching user ranking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
