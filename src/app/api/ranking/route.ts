import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
    
    // Get top characters by ELO
    const rankingResults = await kv.zrange(
      'characters:ranking',
      offset,
      offset + limit - 1,
      {
        rev: true, // Descending order
        withScores: true,
      }
    );
    
    if (!rankingResults || rankingResults.length === 0) {
      return NextResponse.json({ rankings: [] });
    }
    
    // Fetch character details
    const rankings = await Promise.all(
      rankingResults.map(async (item: any) => {
        const characterId = item.member;
        const character = await kv.hgetall(`character:${characterId}`);
        
        return {
          ...character,
          rank: offset + rankingResults.findIndex((r: any) => r.member === characterId) + 1,
          elo: item.score,
        };
      })
    );
    
    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
