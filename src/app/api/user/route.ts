import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

// Create a new user or retrieve existing user
export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json();

    // Basic validation
    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check if user exists
    let user = await kv.hgetall(`user:${address.toLowerCase()}`);

    // Create user if it doesn't exist
    if (!user) {
      user = {
        address: address.toLowerCase(),
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };

      await kv.hset(`user:${address.toLowerCase()}`, user);
    } else {
      // Update last login time
      await kv.hset(`user:${address.toLowerCase()}`, {
        ...user,
        lastLogin: Date.now(),
      });
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Error in user route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get user data
export async function GET(request: NextRequest) {
  try {
    const address = request.nextUrl.searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const user = await kv.hgetall(`user:${address.toLowerCase()}`);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
