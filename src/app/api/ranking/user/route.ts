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

    // 1. 해당 리그의 랭킹 키 확인
    const rankingKey = `league:${league}:ranking`;
    const exists = await kv.exists(rankingKey);
    if (!exists) {
      console.log(`Ranking key ${rankingKey} does not exist`);
      return NextResponse.json({ ranking: null });
    }

    // 2. 사용자의 캐릭터 ID 목록 가져오기
    const characterIds = await kv.smembers(`user:${userId}:characters`);
    if (!characterIds || characterIds.length === 0) {
      console.log(`No characters found for user: ${userId}`);
      return NextResponse.json({ ranking: null });
    }

    console.log(`User ${userId} has ${characterIds.length} characters`);

    // 3. 리그별 캐릭터만 필터링 (각 리그는 독립적)
    const characterPromises = characterIds.map(id =>
      kv.hgetall<Character>(`character:${id}`)
    );

    const characters = await Promise.all(characterPromises);

    // 요청한 리그와 정확히 일치하는 캐릭터만 선택
    const validCharacterIds = characterIds.filter((id, index) => {
      const character = characters[index];
      // 리그가 정확히 일치하는 캐릭터만 포함 (general도 독립적인 리그)
      return character && character.league === league;
    });

    console.log(`User ${userId} has ${validCharacterIds.length} characters in ${league} league`);

    if (validCharacterIds.length === 0) {
      return NextResponse.json({ ranking: null });
    }

    // 4. 각 캐릭터의 랭킹 정보 가져오기
    let bestRank = Infinity;
    let bestCharacterId = null;
    let bestElo = -1;
    let bestCharacterName = '';

    // 각 캐릭터의 랭킹 조회
    for (const id of validCharacterIds) {
      // 캐릭터의 랭킹 위치 조회 (0부터 시작)
      const rank = await kv.zrevrank(rankingKey, id);

      if (rank === null) continue; // 랭킹에 없는 캐릭터

      // 캐릭터의 ELO 점수 조회
      const elo = await kv.zscore(rankingKey, id);

      // 캐릭터 정보 가져오기
      const character = await kv.hgetall<Character>(`character:${id}`);

      if (!character) continue;

      console.log(`Character ${id} (${character.name}) has rank #${rank + 1} with elo ${elo}`);

      // 더 높은 랭킹(낮은 숫자)이면 업데이트
      if (rank < bestRank) {
        bestRank = rank;
        bestCharacterId = id;
        bestElo = elo || 0;
        bestCharacterName = character.name || '';
      }
    }

    // 5. 최고 랭킹 캐릭터 결과 반환
    if (bestCharacterId) {
      const userRanking = {
        characterId: bestCharacterId,
        characterName: bestCharacterName,
        rank: bestRank + 1, // 0-based에서 1-based로 변환
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
