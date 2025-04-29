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

    // 2. 리그 전용 캐릭터 ID 세트 가져오기
    const leagueCharactersKey = `league:${league}:characters`;
    const leagueExists = await kv.exists(leagueCharactersKey);
    
    // 3. 사용자의 캐릭터 ID 목록 가져오기
    const userCharacters = await kv.smembers(`user:${userId}:characters`);
    if (!userCharacters || userCharacters.length === 0) {
      console.log(`No characters found for user: ${userId}`);
      return NextResponse.json({ ranking: null });
    }

    // 4. 리그에 속한 사용자 캐릭터 필터링 (효율적인 집합 연산 사용)
    let validCharacterIds;
    
    if (leagueExists) {
      // 리그 세트가 있으면 교집합 연산으로 빠르게 필터링
      validCharacterIds = await kv.sinter(`user:${userId}:characters`, leagueCharactersKey);
    } else if (league === 'general') {
      // general 리그는 모든 캐릭터 포함
      validCharacterIds = userCharacters;
    } else {
      // 리그 세트가 없으면 각 캐릭터를 개별 확인
      const characterPromises = userCharacters.map(id => 
        kv.hgetall<Character>(`character:${id}`)
      );
      
      const characters = await Promise.all(characterPromises);
      
      // 해당 리그 캐릭터만 필터링
      validCharacterIds = userCharacters.filter((id, index) => {
        const character = characters[index];
        return character && (league === 'general' || character.league === league);
      });
    }

    console.log(`User ${userId} has ${validCharacterIds.length} characters in ${league} league`);
    
    if (validCharacterIds.length === 0) {
      return NextResponse.json({ ranking: null });
    }

    // 5. 여러 캐릭터의 랭킹 일괄 조회 (Pipeline 사용)
    let bestRank = Infinity;
    let bestCharacterId = null;
    let bestElo = -1;
    let bestCharacterName = '';

    // 각 캐릭터의 랭킹 점수를 모두 가져옴
    const rankScores = await Promise.all(
      validCharacterIds.map(async (id) => {
        const rank = await kv.zrevrank(rankingKey, id);
        const score = await kv.zscore(rankingKey, id);
        
        if (rank === null) return null;
        
        return { id, rank, score };
      })
    );

    // 유효한 결과만 필터링하고 랭킹별 정렬
    const validRanks = rankScores
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank);
    
    if (validRanks.length === 0) {
      return NextResponse.json({ ranking: null });
    }
    
    // 최고 랭킹 캐릭터 정보 가져오기
    const bestCharacter = validRanks[0];
    const characterInfo = await kv.hgetall<Character>(`character:${bestCharacter.id}`);
    
    if (!characterInfo) {
      return NextResponse.json({ ranking: null });
    }
    
    // 결과 반환
    const userRanking = {
      characterId: bestCharacter.id,
      characterName: characterInfo.name,
      rank: bestCharacter.rank + 1, // 0-based에서 1-based로 변환
      elo: bestCharacter.score
    };
      
    return NextResponse.json({ ranking: userRanking });
  } catch (error) {
    console.error('Error fetching user ranking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
