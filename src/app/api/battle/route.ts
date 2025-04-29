import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { decideBattleWinner } from '@/lib/battle';
import { Battle, Character, RankingResult, ScoreMember, UpdatedStats } from '@/types';

// Get last battle time for cooldown check
async function getLastBattleTime(characterId: string): Promise<number> {
  const lastBattle = await kv.get<number>(`character:${characterId}:lastBattle`);
  return lastBattle || 0;
}

// Update ELO after battle
async function updateElo(winnerId: string, loserId: string, isDraw: boolean): Promise<UpdatedStats | undefined> {
  const winner = await kv.hgetall<Character>(`character:${winnerId}`);
  const loser = await kv.hgetall<Character>(`character:${loserId}`);

  if (!winner || !loser) return;

  // Basic ELO calculation
  const kFactor = 32;
  const winnerElo = typeof winner.elo === 'number' ? winner.elo : parseInt(winner.elo as unknown as string);
  const loserElo = typeof loser.elo === 'number' ? loser.elo : parseInt(loser.elo as unknown as string);
  const expectedScoreWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));

  let newWinnerElo: number, newLoserElo: number;

  if (isDraw) {
    // Draw - each player gets 0.5 points
    newWinnerElo = Math.round(winnerElo + kFactor * (0.5 - expectedScoreWinner));
    newLoserElo = Math.round(loserElo + kFactor * (0.5 - (1 - expectedScoreWinner)));

    // Update stats
    const winnerDraws = typeof winner.draws === 'number' ? winner.draws : parseInt(winner.draws as unknown as string) || 0;
    const loserDraws = typeof loser.draws === 'number' ? loser.draws : parseInt(loser.draws as unknown as string) || 0;

    await kv.hset(`character:${winnerId}`, {
      ...winner,
      elo: newWinnerElo,
      draws: winnerDraws + 1
    });

    await kv.hset(`character:${loserId}`, {
      ...loser,
      elo: newLoserElo,
      draws: loserDraws + 1
    });
  } else {
    // Win/loss - winner gets 1 point
    newWinnerElo = Math.round(winnerElo + kFactor * (1 - expectedScoreWinner));
    newLoserElo = Math.round(loserElo + kFactor * (0 - (1 - expectedScoreWinner)));

    // Update stats
    const winnerWins = typeof winner.wins === 'number' ? winner.wins : parseInt(winner.wins as unknown as string) || 0;
    const loserLosses = typeof loser.losses === 'number' ? loser.losses : parseInt(loser.losses as unknown as string) || 0;

    await kv.hset(`character:${winnerId}`, {
      ...winner,
      elo: newWinnerElo,
      wins: winnerWins + 1
    });

    await kv.hset(`character:${loserId}`, {
      ...loser,
      elo: newLoserElo,
      losses: loserLosses + 1
    });
  }

  // Update global ranking
  await kv.zadd('characters:ranking', {
    score: newWinnerElo,
    member: winnerId,
  }, {
    score: newLoserElo,
    member: loserId,
  });

  // Determine the leagues and update league-specific rankings
  const winnerLeague = winner.league || 'general';
  const loserLeague = loser.league || 'general';

  // Update winner's league ranking
  await kv.zadd(`league:${winnerLeague}:ranking`, {
    score: newWinnerElo,
    member: winnerId,
  });

  // Update loser's league ranking
  await kv.zadd(`league:${loserLeague}:ranking`, {
    score: newLoserElo,
    member: loserId,
  });

  // Also update 'general' league if it's different
  if (winnerLeague !== 'general') {
    await kv.zadd('league:general:ranking', {
      score: newWinnerElo,
      member: winnerId,
    });
  }

  if (loserLeague !== 'general') {
    await kv.zadd('league:general:ranking', {
      score: newLoserElo,
      member: loserId,
    });
  }

  // Update morse league if applicable
  if (winner.league === 'morse' || loser.league === 'morse') {
    await kv.zadd('league:morse:ranking', {
      score: newWinnerElo,
      member: winnerId,
    }, {
      score: newLoserElo,
      member: loserId,
    });
  }

  // Get updated characters
  const updatedWinner = await kv.hgetall<Character>(`character:${winnerId}`);
  const updatedLoser = await kv.hgetall<Character>(`character:${loserId}`);

  if (!updatedWinner || !updatedLoser) return;

  return {
    winner: updatedWinner,
    loser: updatedLoser
  };
}

// Start a battle
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userAddress = authResult.address;
    const requestData = await request.json();
    const characterId = requestData?.characterId as string;

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
    }

    // Check if character belongs to user
    const userCharactersResponse = await kv.smembers(`user:${userAddress}:characters`);
    // Ensure userCharacters is an array
    const userCharacters = Array.isArray(userCharactersResponse) ? userCharactersResponse : [userCharactersResponse].filter(Boolean);

    if (!userCharacters.includes(characterId)) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check cooldown (3 minutes between battles) - per character
    const lastBattleTime = await getLastBattleTime(characterId);
    const now = Date.now();
    const cooldownPeriod = 3 * 60 * 1000; // 3 minutes in milliseconds

    if (now - lastBattleTime < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (now - lastBattleTime)) / 1000);
      return NextResponse.json(
        { error: `Cooldown period active. Try again in ${remainingTime} seconds` },
        { status: 429 }
      );
    }

    // Get character data
    const character = await kv.hgetall<Character>(`character:${characterId}`);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Find an opponent with similar ELO
    const characterElo = typeof character.elo === 'number' ? character.elo : parseInt(character.elo as unknown as string);
    const eloRange = 200; // Look for characters within +/- 200 ELO

    // Use the range command instead
    const allCharactersResponse = await kv.zrange('characters:ranking', characterElo - eloRange, characterElo + eloRange, { byScore: true, withScores: true, offset: 0, count: 20 });
    // Ensure allCharactersInRange is an array
    const allCharactersInRange = Array.isArray(allCharactersResponse) ? allCharactersResponse : [];

    if (!allCharactersInRange || allCharactersInRange.length === 0) {
      return NextResponse.json({ error: 'Failed to find opponents' }, { status: 500 });
    }

    // Convert array format to object format with member/score
    const opponents: Array<ScoreMember> = [];
    for (let i = 0; i < allCharactersInRange.length; i += 2) {
      const member = String(allCharactersInRange[i]);
      const score = parseFloat(String(allCharactersInRange[i + 1]));

      // Check if score is within ELO range
      if (score >= characterElo - eloRange && score <= characterElo + eloRange) {
        opponents.push({
          member,
          score
        });
      }
    }

    // Filter out the user's own characters
    const possibleOpponents = opponents.filter(
      (opponentEntry) => !userCharacters.includes(opponentEntry.member) && opponentEntry.member !== characterId
    );

    if (possibleOpponents.length === 0) {
      // If no opponents in range, get closest ELO characters
      const allCharactersResponse = await kv.zrange('characters:ranking', 0, -1, { withScores: true });
      // Ensure allCharacters is an array
      const allCharacters = Array.isArray(allCharactersResponse) ? allCharactersResponse : [];

      if (!allCharacters || allCharacters.length === 0) {
        return NextResponse.json({ error: 'Failed to find opponents' }, { status: 500 });
      }

      // Convert array format to object format
      const otherCharactersArray: Array<ScoreMember> = [];
      for (let i = 0; i < allCharacters.length; i += 2) {
        const member = String(allCharacters[i]);
        const score = parseFloat(String(allCharacters[i + 1]));

        if (!userCharacters.includes(member) && member !== characterId) {
          otherCharactersArray.push({
            member,
            score
          });
        }
      }

      // Sort by ELO difference
      const otherCharacters = otherCharactersArray.sort((a, b) => {
        return Math.abs(a.score - characterElo) - Math.abs(b.score - characterElo);
      });

      if (otherCharacters.length === 0) {
        return NextResponse.json({ error: 'No opponents available' }, { status: 404 });
      }

      // Take the closest match
      const opponentId = otherCharacters[0].member;
      const opponent = await kv.hgetall<Character>(`character:${opponentId}`);

      if (!opponent) {
        return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });
      }

      // Determine battle outcome
      const result = await decideBattleWinner(character, opponent);

      // Update ELO and stats
      let updatedStats;
      if (result.winner === 'character1') {
        updatedStats = await updateElo(characterId, opponentId, result.isDraw);
      } else {
        updatedStats = await updateElo(opponentId, characterId, result.isDraw);
      }

      // Store battle result
      const battleId = `battle:${Date.now()}`;
      const battleResult: Battle = {
        id: battleId,
        character1: characterId,
        character2: opponentId,
        winner: result.winner === 'character1' ? characterId : opponentId,
        isDraw: result.isDraw,
        explanation: result.explanation,
        timestamp: Date.now(),
        narrative: result.explanation,
        league: character.league,
      };

      await kv.hset(battleId, battleResult as Record<string, unknown>);

      // Update last battle time for the character instead of the user
      await kv.set(`character:${characterId}:lastBattle`, Date.now());

      // Add battle to user's battle history
      await kv.lpush(`user:${userAddress}:battles`, battleId);

      // Add battle to character's battle history
      await kv.lpush(`character:${characterId}:battles`, battleId);
      await kv.lpush(`character:${opponentId}:battles`, battleId);

      return NextResponse.json({
        success: true,
        battle: battleResult,
        updatedStats,
      });
    } else {
      // Randomly select an opponent from the ELO range
      const randomIndex = Math.floor(Math.random() * possibleOpponents.length);
      const opponentId = possibleOpponents[randomIndex].member;
      const opponent = await kv.hgetall<Character>(`character:${opponentId}`);

      if (!opponent) {
        return NextResponse.json({ error: 'Opponent not found' }, { status: 404 });
      }

      // Determine battle outcome
      const result = await decideBattleWinner(character, opponent);

      // Update ELO and stats
      let updatedStats;
      if (result.winner === 'character1') {
        updatedStats = await updateElo(characterId, opponentId, result.isDraw);
      } else {
        updatedStats = await updateElo(opponentId, characterId, result.isDraw);
      }

      // Store battle result
      const battleId = `battle:${Date.now()}`;
      const battleResult: Battle = {
        id: battleId,
        character1: characterId,
        character2: opponentId,
        winner: result.winner === 'character1' ? characterId : opponentId,
        isDraw: result.isDraw,
        explanation: result.explanation,
        timestamp: Date.now(),
        narrative: result.explanation,
        league: character.league,
      };

      await kv.hset(battleId, battleResult as Record<string, unknown>);

      // Update last battle time for the character instead of the user
      await kv.set(`character:${characterId}:lastBattle`, Date.now());

      // Add battle to user's battle history
      await kv.lpush(`user:${userAddress}:battles`, battleId);

      // Add battle to character's battle history
      await kv.lpush(`character:${characterId}:battles`, battleId);
      await kv.lpush(`character:${opponentId}:battles`, battleId);

      return NextResponse.json({
        success: true,
        battle: battleResult,
        updatedStats,
      });
    }
  } catch (error) {
    console.error('Error in battle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get battle history for a user
export async function GET(request: NextRequest) {
  try {
    const characterId = request.nextUrl.searchParams.get('characterId');
    const userAddress = request.nextUrl.searchParams.get('address');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10');

    if (!characterId && !userAddress) {
      return NextResponse.json({ error: 'Either characterId or address is required' }, { status: 400 });
    }

    let battleIds: string[] = [];
    if (characterId) {
      // Get battles for a specific character
      const response = await kv.lrange(`character:${characterId}:battles`, 0, limit - 1);
      battleIds = Array.isArray(response) ? response : [];
    } else if (userAddress) {
      // Get battles for a user
      const response = await kv.lrange(`user:${userAddress.toLowerCase()}:battles`, 0, limit - 1);
      battleIds = Array.isArray(response) ? response : [];
    }

    if (!battleIds || battleIds.length === 0) {
      return NextResponse.json({ battles: [] });
    }

    // Fetch all battles in parallel
    const battles = await Promise.all(
      battleIds.map(async (id) => {
        const battle = await kv.hgetall<Battle>(id);
        return battle;
      })
    );

    return NextResponse.json({ battles: battles.filter(battle => battle !== null) });
  } catch (error) {
    console.error('Error fetching battles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
