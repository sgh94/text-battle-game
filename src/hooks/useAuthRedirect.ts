'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDiscordAuth } from './useDiscordAuth';

export function useAuthRedirect(requireAuth = true) {
  const { isConnected } = useDiscordAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if auth is required but not connected
    if (requireAuth && !isConnected) {
      router.push('/');
    }
  }, [isConnected, requireAuth, router]);

  return { isConnected };
}
