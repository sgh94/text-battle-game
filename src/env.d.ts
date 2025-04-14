// src/env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: string;
  }
}

// window 타입 확장
interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    isCoinbaseWallet?: boolean;
    providers?: any[];
    selectedAddress?: string | null;
    networkVersion?: string;
    chainId?: string;
    request?: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
    _metamask?: {
      isUnlocked?: () => Promise<boolean>;
    };
  };
  // 이전 버전의 MetaMask/지갑 호환성을 위한 확장
  web3?: any;
}