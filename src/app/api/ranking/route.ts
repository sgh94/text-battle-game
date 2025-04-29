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
    
    // 리그별 랭킹 키 (sorted set)
    const rankingKey = `league:${league}:ranking`;
    
    // 1. 해당 리그의 sorted set이 있는지 확인
    const exists = await kv.exists(rankingKey);
    if (!exists) {
      console.log(`Ranking for league ${league} doesn't exist yet`);
      return NextResponse.json({ rankings: [] });
    }
    
    // 2. 리그별 랭킹 가져오기 (점수 내림차순)
    const topRankings = await kv.zrevrange(rankingKey, offset, offset + limit - 1, { withScores: true });
    if (!topRankings || topRankings.length === 0) {
      console.log(`No rankings found for league ${league}`);
      return NextResponse.json({ rankings: [] });
    }
    
    // 3. ID와 점수 분리
    const characterScores: Array<{id: string, score: number}> = [];
    for (let i = 0; i < topRankings.length; i += 2) {
      const id = String(topRankings[i]);
      const score = Number(topRankings[i + 1]);
      characterScores.push({ id, score });
    }
    
    console.log(`Found ${characterScores.length} top characters for league ${league}`);
    
    // 4. 캐릭터 정보 가져오기 (병렬 요청)
    const rankingsData = await Promise.all(
      characterScores.map(async ({ id, score }, index) => {
        try {
          // 캐릭터 정보 가져오기
          const character = await kv.hgetall<Character>(`character:${id}`);
          
          if (!character) {
            console.log(`Character ${id} not found`);
            return null;
          }
          
          // 리그 필터링 - 각 리그는 독립적이므로 정확히 일치해야 함
          if (character.league !== league) {
            console.log(`Character ${id} (${character.name}) has league ${character.league}, not ${league}`);
            return null;
          }
          
          // 랭킹 정보 추가
          return {
            ...character,
            rank: offset + index + 1,
            elo: score // Sorted Set의 점수 사용
          };
        } catch (err) {
          console.error(`Error fetching character ${id}:`, err);
          return null;
        }
      })
    );
    
    // 유효한 결과만 필터링
    const validRankings = rankingsData.filter(Boolean);
    
    console.log(`Returning ${validRankings.length} ranked characters for league ${league}`);
    
    return NextResponse.json({ rankings: validRankings });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
