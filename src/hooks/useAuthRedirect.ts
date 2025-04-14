'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWeb3 } from '@/providers/Web3Provider';

export function useAuthRedirect(requireAuth = true) {
  const { isConnected } = useWeb3();
  const router = useRouter();

  useEffect(() => {
    // Redirect if auth is required but not connected
    if (requireAuth && !isConnected) {
      router.push('/');
    }
  }, [isConnected, requireAuth, router]);

  return { isConnected };
}
