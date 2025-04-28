import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character, ScoreMember } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    const league = request.nextUrl.searchParams.get('league') || 'general';

    // Get top characters by ELO for the specified league
    const rankingKey = `league:${league}:ranking`;
    
    // Check if league-specific ranking exists, otherwise create it
    const exists = await kv.exists(rankingKey);
    if (!exists) {
      console.log(`Creating new ranking for league: ${league}`);
      // This is a new league ranking - we'll just return empty results now
      // and populate it when characters in this league are created
      return NextResponse.json({ rankings: [] });
    }

    const rankingResultsResponse = await kv.zrange(
      rankingKey,
      0,
      -1,
      {
        rev: true, // Descending order (highest scores first)
        withScores: true,
      }
    );

    // Ensure rankingResults is an array
    const rankingResults = Array.isArray(rankingResultsResponse) ? rankingResultsResponse : [];

    if (!rankingResults || rankingResults.length === 0) {
      return NextResponse.json({ rankings: [] });
    }

    // Convert array format to object format
    const characterScores: Array<ScoreMember> = [];
    for (let i = 0; i < rankingResults.length; i += 2) {
      const member = String(rankingResults[i]);
      const score = parseFloat(String(rankingResults[i + 1]));
      characterScores.push({
        member,
        score
      });
    }

    // Apply pagination
    const paginatedScores = characterScores.slice(offset, offset + limit);

    // Fetch character details
    const rankings = await Promise.all(
      paginatedScores.map(async (item: ScoreMember, index: number) => {
        const characterId = item.member;
        const character = await kv.hgetall<Character>(`character:${characterId}`);

        if (!character) return null;

        // Make sure to use the score from the ranking, not from the character object
        // This ensures we display the most up-to-date ELO from the sorted set
        return {
          ...character,
          rank: offset + index + 1,
          elo: item.score, // Use the score from the sorted set
        };
      })
    );

    // Filter out null values and ensure characters are in the correct league or 'general'
    const filteredRankings = rankings
      .filter((ranking): ranking is Character & { rank: number, elo: number } => 
        ranking !== null && (
          !ranking.league || 
          ranking.league === league || 
          league === 'general'
        )
      );

    // Debug logging - useful for troubleshooting
    console.log(`League ${league} rankings - found ${filteredRankings.length} characters`);
    console.log('First few rankings:', filteredRankings.slice(0, 3).map(r => ({
      id: r.id,
      name: r.name,
      elo: r.elo,
      rank: r.rank
    })));

    return NextResponse.json({ rankings: filteredRankings });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
