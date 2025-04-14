import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { User } from '@/types';

// Create a new user or retrieve existing user
export async function POST(request: NextRequest) {
  try {
    const { address, message, signature } = await request.json();

    // Basic validation
    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the signature
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }

    const lowerCaseAddress = address.toLowerCase();
    let user: User | null = null;

    try {
      // Try to get user from KV
      user = await kv.hgetall<User>(`user:${lowerCaseAddress}`);
    } catch (kvError) {
      console.warn('KV database error', kvError);
    }

    // Create user if it doesn't exist
    if (!user) {
      const newUser: User = {
        address: lowerCaseAddress,
        createdAt: Date.now(),
        lastLogin: Date.now(),
      };

      try {
        await kv.hset(`user:${lowerCaseAddress}`, newUser as Record<string, unknown>);
      } catch (kvError) {
        console.warn('KV database error on create', kvError);
      }

      user = newUser;
    } else {
      // Update last login time
      const updatedUser = {
        ...user,
        lastLogin: Date.now(),
      };

      try {
        await kv.hset(`user:${lowerCaseAddress}`, updatedUser as Record<string, unknown>);
      } catch (kvError) {
        console.warn('KV database error on update', kvError);
      }

      user = updatedUser;
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

    const lowerCaseAddress = address.toLowerCase();
    let user: User | null = null;

    try {
      // Try to get user from KV
      user = await kv.hgetall<User>(`user:${lowerCaseAddress}`);
    } catch (kvError) {
      console.warn('KV database error on get', kvError);
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
