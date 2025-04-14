'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { FC, PropsWithChildren, useEffect, useState } from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config, getWalletConnectMetadata } from '@/lib/wallet-config';
import { Web3Provider } from '@/providers/Web3Provider';

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

// localStorage 사용하는 persister 생성 (브라우저 환경에서만)
const createPersister = () => {
  if (typeof window === 'undefined') return null;
  
  return createSyncStoragePersister({
    key: 'text-battle-cache',
    storage: window.localStorage,
    serialize: (data) => JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
    deserialize: (data) => JSON.parse(data),
  });
};

const WalletProvider: FC<PropsWithChildren> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  // 마운트 시 설정 초기화
  useEffect(() => {
    // 마운트 상태 업데이트
    setMounted(true);
    
    // 브라우저 환경인 경우에만 캐시 설정
    if (typeof window !== 'undefined') {
      const persister = createPersister();
      if (persister) {
        persistQueryClient({
          queryClient,
          persister,
          maxAge: 1000 * 60 * 60 * 24, // 24시간
        });
      }
    }
  }, []);

  // SSR을 위한 처리 - 마운트 전에는 렌더링 하지 않음
  if (!mounted) return null;
  
  // 메타 데이터 설정 (현재 URL 기반)
  const metadata = getWalletConnectMetadata();

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
          appInfo={{
            appName: metadata.name,
            learnMoreUrl: metadata.url,
          }}
        >
          <Web3Provider>
            {children}
          </Web3Provider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletProvider;
