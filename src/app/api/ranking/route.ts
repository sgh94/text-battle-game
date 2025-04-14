import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character, ScoreMember } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    
    // Get top characters by ELO
    const rankingResultsResponse = await kv.zrange(
      'characters:ranking',
      0,
      -1,
      {
        rev: true, // Descending order
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
      const member = rankingResults[i];
      const score = parseFloat(rankingResults[i + 1]);
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
        
        return {
          ...character,
          rank: offset + index + 1,
          elo: item.score,
        };
      })
    );
    
    return NextResponse.json({ rankings: rankings.filter((ranking): ranking is Character & { rank: number, elo: number } => ranking !== null) });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
