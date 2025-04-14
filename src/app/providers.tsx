// src/app/providers.tsx (혹은 원하는 위치에 생성)
'use client'; // 이 파일은 클라이언트 컴포넌트입니다.

import { useState, ReactNode } from 'react'; // React Query v5부터는 useState 필요 X
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

import { Web3Provider } from '@/providers/Web3Provider'; // Web3Provider 경로 확인

// WalletConnect 프로젝트 ID 설정 (환경 변수 사용 권장)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  console.warn("Warning: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect functionality will be limited.");
}

// Wagmi 설정 생성
const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(projectId ? [walletConnect({ projectId })] : []),
    coinbaseWallet({ appName: 'Text Battle Game', darkMode: true }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  // ssr: true, // 필요시 활성화
});

// React Query 클라이언트 생성 (v5 스타일)
// useState를 사용하여 클라이언트 측에서만 인스턴스 생성 보장
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SSR/SSG 사용 시 staleTime 설정 고려
        staleTime: 60 * 1000, // 1분
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: 항상 새 클라이언트 생성
    return makeQueryClient();
  } else {
    // Browser: 싱글톤 패턴 사용
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}


export default function Providers({ children }: { children: ReactNode }) {
  // 클라이언트 측에서만 queryClient 인스턴스 유지 (React Query v5 권장 방식)
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Web3Provider>
          {children}
        </Web3Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}