import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  argentWallet,
  braveWallet,
  coinbaseWallet,
  injectedWallet,
  ledgerWallet,
  metaMaskWallet,
  okxWallet,
  safeWallet,
  trustWallet,
  walletConnectWallet,
  phantomWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

// 앱 정보 설정
export const RainbowKitAppName = 'Text Battle Game';

// WalletConnect 프로젝트 ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c8037616aed3334d648e7c7061ece6d7';

// 지원할 체인 설정
export const chains = [mainnet, sepolia];

// RainbowKit 커넥터 생성 함수
export const createRainbowKitConnectors = () => {
  return connectorsForWallets([
    {
      groupName: '인기 지갑',
      wallets: [
        injectedWallet({ projectId }),
        metaMaskWallet({ projectId }),
        coinbaseWallet({ 
          appName: RainbowKitAppName,
          projectId
        }),
        walletConnectWallet({ projectId }),
      ],
    },
    {
      groupName: '기타 지갑',
      wallets: [
        okxWallet({ projectId }),
        phantomWallet(),
        braveWallet(),
        argentWallet({ projectId }),
        trustWallet({ projectId }),
        ledgerWallet({ projectId }),
        safeWallet(),
      ],
    },
  ]);
};

// Wagmi 설정 생성 함수
export const createWagmiConfig = () => {
  return createConfig({
    chains,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
    connectors: createRainbowKitConnectors(),
  });
};

// 기본 Wagmi 설정
export const defaultWagmiConfig = createWagmiConfig();
