import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { ethers } from 'ethers';

// Verify a signature against a stored nonce
export async function POST(request: NextRequest) {
  try {
    const { address, signature } = await request.json();

    if (!address || !signature) {
      return NextResponse.json({ error: 'Address and signature are required' }, { status: 400 });
    }

    // Get the stored nonce
    const nonceData: {
      nonce: string;
    } | null = await kv.get(`nonce:${address.toLowerCase()}`);

    if (!nonceData) {
      return NextResponse.json({ error: 'Nonce not found or expired' }, { status: 400 });
    }

    // Construct the message that was signed
    const message = `Sign this message to authenticate with Text Battle Game: ${nonceData.nonce}`;

    // Verify the signature
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature);

      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }

      // Delete the used nonce
      await kv.del(`nonce:${address.toLowerCase()}`);

      // Generate an auth token
      const token = ethers.hexlify(ethers.randomBytes(32));
      const now = Date.now();
      const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours

      await kv.set(`token:${token}`, {
        address: address.toLowerCase(),
        createdAt: now,
        expiresAt,
      });

      return NextResponse.json({
        success: true,
        token,
        expiresAt,
      });
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
    }
  } catch (error) {
    console.error('Error verifying signature:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
