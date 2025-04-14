// src/app/providers.tsx
'use client'; // 이 파일은 클라이언트 컴포넌트입니다.

import { useState, ReactNode, useEffect } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

import { Web3Provider } from '@/providers/Web3Provider'; // Web3Provider 경로 확인

// WalletConnect 프로젝트 ID 설정 (환경 변수 사용)
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c8037616aed3334d648e7c7061ece6d7';

// Wagmi 설정 생성 - MetaMask 연결 강제 활성화
const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    // MetaMask 및 기타 브라우저 지갑
    injected({
      shimDisconnect: true,
      target: 'metaMask',
    }),

    // WalletConnect
    walletConnect({
      projectId,
      showQrModal: true,
      metadata: {
        name: 'Text Battle Game',
        description: 'A web3-based text battle game',
        url: window?.location?.origin || 'https://text-battle-game.vercel.app',
        icons: ['https://textbattle.example.com/icon.png']
      }
    }),

    // Coinbase Wallet
    coinbaseWallet({
      appName: 'Text Battle Game',
      appLogoUrl: '/logo.png',
      darkMode: true
    }),

    // Phantom Wallet (Solana)
    injected({
      target: 'phantom',
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// React Query 클라이언트 생성 (v5 스타일)
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
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
  const [mounted, setMounted] = useState(false);

  // 마운트 상태 관리
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ethereum Provider 상태 로깅
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      console.log('Ethereum provider found:', {
        isMetaMask: window.ethereum.isMetaMask,
        selectedAddress: window.ethereum.selectedAddress,
        chainId: window.ethereum.chainId
      });

      // MetaMask 상태 강제 새로고침 시도
      if (window.ethereum.isMetaMask) {
        const checkMetaMaskState = async () => {
          try {
            // 계정 접근 요청 (이미 연결된 경우 바로 반환)
            await window.ethereum!.request!({ method: 'eth_accounts' });
            console.log("MetaMask account status checked");
          } catch (err) {
            console.error("Error checking MetaMask accounts:", err);
          }
        };

        checkMetaMaskState();
      }

      // 지갑 상태 변경 이벤트 리스닝
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('Accounts changed:', accounts);
        // 페이지 새로고침 (선택사항)
        if (accounts.length === 0) {
          console.log("No accounts available, user may have disconnected");
        }
      };

      const handleChainChanged = (chainId: string) => {
        console.log('Chain changed:', chainId);
        // 체인 변경 시 페이지 새로고침 (MetaMask 권장사항)
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum!.removeListener('chainChanged', handleChainChanged);
      };
    } else {
      console.log('No Ethereum provider found');
    }
  }, [mounted]);

  // 마운트 전에는 로딩 상태 또는 아무것도 렌더링하지 않음
  if (!mounted) {
    return null;
  }

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