import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Generate a new nonce for wallet signing
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Generate a nonce
    const nonce = Math.floor(Math.random() * 1000000).toString();
    const timestamp = Date.now();

    // Store the nonce with an expiration (5 minutes)
    await kv.set(`nonce:${address.toLowerCase()}`, {
      nonce,
      timestamp,
    }, { ex: 300 }); // 300 seconds = 5 minutes

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
