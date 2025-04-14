import {
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';

// 앱 정보 설정
export const RainbowKitAppName = 'Text Battle Game';

// WalletConnect 프로젝트 ID
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c8037616aed3334d648e7c7061ece6d7';

// 지원할 체인 설정 - mainnet과 테스트넷 모두 포함
export const chains = [mainnet, sepolia, polygon, optimism, arbitrum, base];

// Wagmi 설정 생성 (브라우저에서만 실행)
export const config = getDefaultConfig({
  appName: 'Text Battle Game',
  projectId: projectId,
  chains: chains as any,
  ssr: true, // SSR 지원 활성화
});

// WalletConnect metadata 설정 함수 - 동적 URL 생성
export const getWalletConnectMetadata = () => {
  let url = 'https://text-battle-game.vercel.app';

  // 브라우저 환경에서만 window 객체에 접근
  if (typeof window !== 'undefined') {
    url = window.location.origin;
  }

  return {
    name: 'Text Battle Game',
    description: 'A web3-based text battle game with LLM decision making',
    url: url,
    icons: [`${url}/icon.png`]
  };
};
