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
import { Chain, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { WalletList } from '@rainbow-me/rainbowkit/dist/wallets/Wallet';

// 앱 정보 설정
export const RainbowKitAppName = 'Text Battle Game';

// WalletConnect 프로젝트 ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c8037616aed3334d648e7c7061ece6d7';

// 지원할 체인 설정
export const chains: Chain[] = [mainnet, sepolia];

// RainbowKit 커넥터 생성 함수
export const createRainbowKitConnectors = (walletList?: WalletList) => {
  return connectorsForWallets(
    [
      {
        groupName: '인기 지갑',
        wallets: [
          injectedWallet({ 
            chains,
            shimDisconnect: true 
          }),
          metaMaskWallet({ 
            chains,
            projectId 
          }),
          coinbaseWallet({ 
            appName: RainbowKitAppName,
            chains 
          }),
          walletConnectWallet({ 
            projectId, 
            chains 
          }),
        ],
      },
      ...(walletList ?? []),
      {
        groupName: '기타 지갑',
        wallets: [
          okxWallet({ chains, projectId }),
          phantomWallet({ chains }),
          braveWallet({ chains }),
          argentWallet({ chains, projectId }),
          trustWallet({ chains, projectId }),
          ledgerWallet({ chains, projectId }),
          safeWallet({ chains }),
        ],
      },
    ],
    {
      appName: RainbowKitAppName,
      projectId,
    }
  );
};

// Wagmi 설정 생성 함수
export const createWagmiConfig = (walletList?: WalletList) => {
  return createConfig({
    chains,
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
    connectors: createRainbowKitConnectors(walletList),
  });
};

// 기본 Wagmi 설정
export const defaultWagmiConfig = createWagmiConfig();
