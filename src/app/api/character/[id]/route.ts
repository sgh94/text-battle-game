import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character } from '@/types';
import { validateAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const characterId = params.id;
    const character = await kv.hgetall<Character>(`character:${characterId}`);

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    return NextResponse.json({ character });
  } catch (error) {
    console.error('Error fetching character:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    // Delete character data
    await kv.del(`character:${characterId}`);

    // Remove from user's character list
    await kv.srem(`user:${character.owner}:characters`, characterId);

    // Remove from global ranking
    await kv.zrem('characters:ranking', characterId);

    // Delete character battle cooldown
    await kv.del(`character:${characterId}:lastBattle`);

    // Get the character's battle history to clean up
    const battleIdsResponse = await kv.lrange(`character:${characterId}:battles`, 0, -1);
    const battleIds = Array.isArray(battleIdsResponse) ? battleIdsResponse : [];

    // Remove character's battle history
    if (battleIds.length > 0) {
      await kv.del(`character:${characterId}:battles`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
