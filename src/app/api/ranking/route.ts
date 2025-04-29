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
        try {
          const characterId = item.member;
          const character = await kv.hgetall<Character>(`character:${characterId}`);

          if (!character) {
            console.log(`Character not found: ${characterId}`);
            return null;
          }

          // Make sure to use the score from the ranking, not from the character object
          // This ensures we display the most up-to-date ELO from the sorted set
          return {
            ...character,
            rank: offset + index + 1,
            elo: item.score, // Use the score from the sorted set
          };
        } catch (err) {
          console.error(`Error fetching character ${item.member}:`, err);
          return null;
        }
      })
    );

    // Strict filtering: only show characters that exactly match the requested league
    const filteredRankings = rankings
      .filter((ranking): ranking is Character & { rank: number, elo: number } => {
        if (!ranking) return false;
        
        // 리그가 정확히 일치하는지 확인
        // 'general' 리그는 예외적으로 모든 캐릭터가 표시될 수 있음
        const leagueMatches = league === 'general' || ranking.league === league;
        
        if (!leagueMatches) {
          console.log(`Character ${ranking.id} (${ranking.name}) filtered out - in league ${ranking.league}, requested ${league}`);
        }
        
        return leagueMatches;
      });

    // Re-rank after filtering to ensure consistent numbering
    const rankedResults = filteredRankings.map((character, index) => ({
      ...character,
      rank: offset + index + 1
    }));

    // Debug logging - useful for troubleshooting
    console.log(`League ${league} rankings - found ${rankedResults.length} characters`);
    console.log('First few rankings:', rankedResults.slice(0, 3).map(r => ({
      id: r.id,
      name: r.name,
      elo: r.elo,
      league: r.league,
      rank: r.rank
    })));

    return NextResponse.json({ rankings: rankedResults });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
