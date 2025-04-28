import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character } from '@/types';
import { validateAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userAddress = authResult.address;
    const characterId = params.id;
    const character = await kv.hgetall<Character>(`character:${characterId}`);

    if (!userAddress) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Verify ownership
    if (character.owner.toLowerCase() !== userAddress!.toLowerCase()) {
      return NextResponse.json({ error: 'You do not own this character' }, { status: 403 });
    }

    // Get new traits from request body
    const { traits } = await request.json();
    if (!traits || typeof traits !== 'string' || traits.trim() === '') {
      return NextResponse.json({ error: 'Valid traits are required' }, { status: 400 });
    }

    // Check cooldown (6 hours between trait updates)
    const lastTraitUpdate = await kv.get<number>(`character:${characterId}:lastTraitUpdate`);
    const now = Date.now();
    const cooldownPeriod = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

    if (lastTraitUpdate && now - lastTraitUpdate < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (now - lastTraitUpdate)) / 1000);
      const hours = Math.floor(remainingTime / 3600);
      const minutes = Math.floor((remainingTime % 3600) / 60);
      const seconds = remainingTime % 60;
      
      return NextResponse.json(
        { 
          error: `Cooldown period active. Try again in ${hours}h ${minutes}m ${seconds}s`,
          remainingSeconds: remainingTime
        },
        { status: 429 }
      );
    }

    // Apply 25% ELO penalty
    const currentElo = typeof character.elo === 'number' ? character.elo : parseInt(character.elo as unknown as string);
    const penaltyElo = Math.round(currentElo * 0.75); // 25% reduction

    // Update character traits and ELO
    await kv.hset(`character:${characterId}`, {
      ...character,
      traits,
      elo: penaltyElo
    });

    // Update global ranking
    await kv.zadd('characters:ranking', {
      score: penaltyElo,
      member: characterId,
    });

    // Determine the league and update league-specific ranking
    const league = character.league || 'general';
    
    // Update league-specific ranking
    await kv.zadd(`league:${league}:ranking`, {
      score: penaltyElo,
      member: characterId,
    });

    // Also update 'general' league if it's different
    if (league !== 'general') {
      await kv.zadd('league:general:ranking', {
        score: penaltyElo,
        member: characterId,
      });
    }

    // Set last trait update time
    await kv.set(`character:${characterId}:lastTraitUpdate`, now);

    // Get updated character
    const updatedCharacter = await kv.hgetall<Character>(`character:${characterId}`);

    return NextResponse.json({ 
      success: true, 
      character: updatedCharacter,
      previousElo: currentElo,
      newElo: penaltyElo,
      eloReduction: currentElo - penaltyElo
    });
  } catch (error) {
    console.error('Error updating character traits:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const characterId = params.id;
    
    // Check cooldown (6 hours between trait updates)
    const lastTraitUpdate = await kv.get<number>(`character:${characterId}:lastTraitUpdate`);
    const now = Date.now();
    const cooldownPeriod = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

    if (lastTraitUpdate && now - lastTraitUpdate < cooldownPeriod) {
      const remainingTime = Math.ceil((cooldownPeriod - (now - lastTraitUpdate)) / 1000);
      return NextResponse.json({ 
        cooldown: true,
        remainingSeconds: remainingTime
      });
    }

    return NextResponse.json({ 
      cooldown: false,
      remainingSeconds: 0
    });
  } catch (error) {
    console.error('Error checking trait update cooldown:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
