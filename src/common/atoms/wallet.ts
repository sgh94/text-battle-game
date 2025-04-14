import { atom, useAtom } from 'jotai';
import { http, createConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { 
  getDefaultWallets, 
  connectorsForWallets,
  Wallet
} from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  phantomWallet
} from '@rainbow-me/rainbowkit/wallets';

// 앱 이름 설정
export const RainbowKitAppName = 'Text Battle Game';

// 지원할 체인 설정
export const chains = [mainnet, sepolia];

// WalletConnect projectId
const projectId = typeof window !== 'undefined' 
  ? (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c8037616aed3334d648e7c7061ece6d7')
  : 'c8037616aed3334d648e7c7061ece6d7';

// 기본 지갑 설정 가져오기
const { wallets } = getDefaultWallets({
  appName: RainbowKitAppName,
  projectId
});

// 추가 지갑 설정
const extraWallets = [
  phantomWallet(),
];

// 기본 Wagmi 설정 생성
export const defaultWagmiConfig = createConfig({
  connectors: connectorsForWallets([
    {
      groupName: 'Recommended',
      wallets: [...wallets],
    },
    {
      groupName: 'Others',
      wallets: [...extraWallets],
    },
  ]),
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

// 커스텀 Wagmi 설정 생성 함수
export const createWagmiConfig = (
  customWallets: {
    groupName: string;
    wallets: Wallet[];
  }[],
) => {
  return createConfig({
    connectors: connectorsForWallets([
      ...customWallets,
      {
        groupName: 'Popular',
        wallets: [
          metaMaskWallet({ projectId }),
          coinbaseWallet({ 
            appName: RainbowKitAppName
          }),
          walletConnectWallet({ projectId }),
        ],
      },
      {
        groupName: 'Others',
        wallets: [...extraWallets],
      },
    ]),
    transports: {
      [mainnet.id]: http(),
      [sepolia.id]: http(),
    },
  });
};

// Wagmi 설정을 저장할 atom
const wagmiConfigAtom = atom(defaultWagmiConfig);

// Wagmi 설정을 가져오는 hook
export const useWagmiConfig = () => {
  const [wagmiConfig] = useAtom(wagmiConfigAtom);
  return wagmiConfig;
};

// Wagmi 설정을 업데이트하는 hook
export const useUpdateWagmiConfig = () => {
  const [, setWagmiConfig] = useAtom(wagmiConfigAtom);
  return setWagmiConfig;
};
