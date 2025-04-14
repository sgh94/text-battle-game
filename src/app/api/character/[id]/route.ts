import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { Character } from '@/types';

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
    // Implement authentication and authorization here
    
    const characterId = params.id;
    const character = await kv.hgetall<Character>(`character:${characterId}`);

    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Delete character data
    await kv.del(`character:${characterId}`);
    
    // Remove from user's character list
    await kv.srem(`user:${character.owner}:characters`, characterId);
    
    // Remove from global ranking
    await kv.zrem('characters:ranking', characterId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting character:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
