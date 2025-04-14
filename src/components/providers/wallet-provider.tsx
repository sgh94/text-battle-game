'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { useWagmiConfig, useUpdateWagmiConfig } from '@/lib/atoms/wallet';
import { createWagmiConfig, defaultWagmiConfig, chains } from '@/lib/wallet-config';

// RainbowKit CSS import
import '@rainbow-me/rainbowkit/styles.css';

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5분
      gcTime: 1000 * 60 * 60 * 24, // 24시간
      refetchOnWindowFocus: false,
      retry: 0
    },
  },
});

// localStorage 사용하는 persister 생성
const persister = createSyncStoragePersister({
  key: 'text-battle-cache',
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  serialize: (data) => JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  deserialize: (data) => JSON.parse(data),
});

// 캐시 설정 적용
persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24, // 24시간
});

const WalletProvider: FC<PropsWithChildren> = ({ children }) => {
  const config = useWagmiConfig();
  const updateWagmiConfig = useUpdateWagmiConfig();
  const [mounted, setMounted] = useState(false);

  // 커스텀 지갑 로딩
  const loadCustomWallets = async () => {
    try {
      // 커스텀 지갑 구성이 추가될 수 있음
      // 기본 설정 적용
      updateWagmiConfig(defaultWagmiConfig);
    } catch (error) {
      console.error('지갑 로딩 중 오류 발생:', error);
      updateWagmiConfig(defaultWagmiConfig);
    }
  };

  // 마운트 시 설정 초기화
  useEffect(() => {
    setMounted(true);
    loadCustomWallets();
  }, []);

  // SSR을 위한 처리 - 마운트 전에는 렌더링 하지 않음
  if (!mounted || !config) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7c3aed', // 보라색 테마
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          modalSize="compact"
          coolMode // 애니메이션 효과
          chains={chains}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletProvider;
