import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { decideBattleWinner } from '@/lib/battle';

// Get last battle time for cooldown check
async function getLastBattleTime(userAddress: string) {
  const lastBattle = await kv.get(`user:${userAddress}:lastBattle`);
  return lastBattle || 0;
}

// Update ELO after battle
async function updateElo(winnerId: string, loserId: string, isDraw: boolean) {
  const winner = await kv.hgetall(`character:${winnerId}`);
  const loser = await kv.hgetall(`character:${loserId}`);
  
  if (!winner || !loser) return;
  
  // Basic ELO calculation
  const kFactor = 32;
  const expectedScoreWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
  
  let newWinnerElo, newLoserElo;
  
  if (isDraw) {
    // Draw - each player gets 0.5 points
    newWinnerElo = Math.round(winner.elo + kFactor * (0.5 - expectedScoreWinner));
    newLoserElo = Math.round(loser.elo + kFactor * (0.5 - (1 - expectedScoreWinner)));
    
    // Update stats
    await kv.hset(`character:${winnerId}`, {
      ...winner,
      elo: newWinnerElo,
      draws: (parseInt(winner.draws) || 0) + 1
    });
    
    await kv.hset(`character:${loserId}`, {
      ...loser,
      elo: newLoserElo,
      draws: (parseInt(loser.draws) || 0) + 1
    });
  } else {
    // Win/loss - winner gets 1 point
    newWinnerElo = Math.round(winner.elo + kFactor * (1 - expectedScoreWinner));
    newLoserElo = Math.round(loser.elo + kFactor * (0 - (1 - expectedScoreWinner)));
    
    // Update stats
    await kv.hset(`character:${winnerId}`, {
      ...winner,
      elo: newWinnerElo,
      wins: (parseInt(winner.wins) || 0) + 1
    });
    
    await kv.hset(`character:${loserId}`, {
      ...loser,
      elo: newLoserElo,
      losses: (parseInt(loser.losses) || 0) + 1
    });
  }
  
  // Update rankings
  await kv.zadd('characters:ranking', [
    { score: newWinnerElo, member: winnerId },
    { score: newLoserElo, member: loserId }
  ]);
  
  return {
    winner: { ...winner, elo: newWinnerElo },
    loser: { ...loser, elo: newLoserElo }
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
    const { characterId } = await request.json();

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
    }

    // Check if character belongs to user
    const userCharacters = await kv.smembers(`user:${userAddress}:characters`);
    if (!userCharacters.includes(characterId)) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Check cooldown (3 minutes between battles)
    const lastBattleTime = await getLastBattleTime(userAddress);
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
    const character = await kv.hgetall(`character:${characterId}`);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Find an opponent with similar ELO
    const elo = parseInt(character.elo);
    const eloRange = 200; // Look for characters within +/- 200 ELO
    
    // Get characters within ELO range
    const opponents = await kv.zrangebyscore(
      'characters:ranking',
      elo - eloRange,
      elo + eloRange
    );
    
    // Filter out the user's own characters
    const possibleOpponents = opponents.filter(
      (id) => !userCharacters.includes(id) && id !== characterId
    );
    
    if (possibleOpponents.length === 0) {
      // If no opponents in range, get closest ELO characters
      const allCharacters = await kv.zrange('characters:ranking', 0, -1, { withScores: true });
      
      // Filter out user's characters and sort by ELO difference
      const otherCharacters = allCharacters
        .filter((entry) => !userCharacters.includes(entry.member) && entry.member !== characterId)
        .sort((a, b) => Math.abs(a.score - elo) - Math.abs(b.score - elo));
      
      if (otherCharacters.length === 0) {
        return NextResponse.json({ error: 'No opponents available' }, { status: 404 });
      }
      
      // Take the closest match
      const opponentId = otherCharacters[0].member;
      const opponent = await kv.hgetall(`character:${opponentId}`);
      
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
      const battleResult = {
        id: battleId,
        character1: characterId,
        character2: opponentId,
        winner: result.winner === 'character1' ? characterId : opponentId,
        isDraw: result.isDraw,
        explanation: result.explanation,
        timestamp: Date.now(),
      };
      
      await kv.hset(battleId, battleResult);
      
      // Update last battle time
      await kv.set(`user:${userAddress}:lastBattle`, Date.now());
      
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
      const opponentId = possibleOpponents[randomIndex];
      const opponent = await kv.hgetall(`character:${opponentId}`);
      
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
      const battleResult = {
        id: battleId,
        character1: characterId,
        character2: opponentId,
        winner: result.winner === 'character1' ? characterId : opponentId,
        isDraw: result.isDraw,
        explanation: result.explanation,
        timestamp: Date.now(),
      };
      
      await kv.hset(battleId, battleResult);
      
      // Update last battle time
      await kv.set(`user:${userAddress}:lastBattle`, Date.now());
      
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
    
    let battleIds;
    if (characterId) {
      // Get battles for a specific character
      battleIds = await kv.lrange(`character:${characterId}:battles`, 0, limit - 1);
    } else {
      // Get battles for a user
      battleIds = await kv.lrange(`user:${userAddress.toLowerCase()}:battles`, 0, limit - 1);
    }
    
    if (!battleIds || battleIds.length === 0) {
      return NextResponse.json({ battles: [] });
    }
    
    // Fetch all battles in parallel
    const battles = await Promise.all(
      battleIds.map(async (id) => {
        const battle = await kv.hgetall(id);
        return battle;
      })
    );
    
    return NextResponse.json({ battles });
  } catch (error) {
    console.error('Error fetching battles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
