import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const characterId = request.nextUrl.searchParams.get('characterId');

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
    }

    // Get last battle time for the character
    const lastBattleTime = await kv.get<number>(`character:${characterId}:lastBattle`) || 0;
    
    // Calculate remaining cooldown in seconds
    const now = Date.now();
    const cooldownPeriod = 3 * 60 * 1000; // 3 minutes in milliseconds
    const remainingCooldown = Math.max(0, Math.ceil((lastBattleTime + cooldownPeriod - now) / 1000));
    
    return NextResponse.json({ cooldown: remainingCooldown });
  } catch (error) {
    console.error('Error checking cooldown:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
