'use client';

import { FC, PropsWithChildren, useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import {
  useWagmiConfig,
  useUpdateWagmiConfig,
  defaultWagmiConfig,
  createWagmiConfig
} from "~/common/atoms/wallet";

// RainbowKit CSS 추가
import "@rainbow-me/rainbowkit/styles.css";

// QueryClient 생성
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1분
    },
  },
});

const WalletProvider: FC<PropsWithChildren> = ({ children }) => {
  const config = useWagmiConfig();
  const updateWagmiConfig = useUpdateWagmiConfig();
  const [mounted, setMounted] = useState(false);

  // 커스텀 지갑 로딩 함수 (예: 캡슐 지갑 등)
  const loadCustomWallets = async () => {
    try {
      // 여기서 필요한 경우 커스텀 지갑을 로드할 수 있습니다.
      // 예: 캡슐 지갑, 이메일 로그인 지갑 등

      // 예시: 기본 설정에 추가 옵션 설정
      updateWagmiConfig(defaultWagmiConfig);
    } catch (error) {
      console.error("Error loading custom wallets:", error);
      // 오류 발생 시 기본 설정 사용
      updateWagmiConfig(defaultWagmiConfig);
    }
  };

  // 마운트 시 실행
  useEffect(() => {
    setMounted(true);
    loadCustomWallets();
  }, []);

  // SSR 렌더링 시 오류 방지
  if (!mounted || config === null) return null;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={lightTheme({
            accentColor: '#7c3aed', // 주요 색상 (보라색)
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
          })}
          modalSize="compact"
          coolMode // 애니메이션 효과 추가
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default WalletProvider;
