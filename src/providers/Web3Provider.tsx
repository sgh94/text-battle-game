'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage
} from 'wagmi';

interface Web3ContextType {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  connectWallet: (connector?: any) => void;
  disconnectWallet: () => void;
  authHeader: string | null;
  error: string | null;
  signAuthMessage: () => Promise<string | null>;
}

const Web3Context = createContext<Web3ContextType>({
  address: undefined,
  isConnected: false,
  isConnecting: false,
  connectWallet: () => { },
  disconnectWallet: () => { },
  authHeader: null,
  error: null,
  signAuthMessage: async () => null,
});

export const useWeb3 = () => useContext(Web3Context);

export function Web3Provider({ children }: { children: ReactNode }) {
  const { address, isConnected, isConnecting: isAccountConnecting, connector: activeConnector } = useAccount();
  const { connect, connectors, error: connectError, isPending: isWagmiConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, error: signError, isPending: isSigning } = useSignMessage();

  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

  // Attempt to auto-connect on initial load if Ethereum is available
  useEffect(() => {
    // 이더리움 공급자가 있을 경우 즉시 연결 시도
    const autoConnect = async () => {
      try {
        if (typeof window !== 'undefined' && window.ethereum) {
          // 자동 연결 시도가 이미 진행 중인지 체크
          if (!isWagmiConnecting && !isConnected) {
            console.log("Attempting auto-connect with available provider");
            
            // 먼저 MetaMask 커넥터를 찾습니다
            const metaMaskConnector = connectors.find(c => 
              c.id === 'injected' && c.name === 'MetaMask' && c.ready
            );
            
            // 또는 준비된 다른 커넥터를 찾습니다
            const readyConnector = connectors.find(c => c.ready);
            
            if (metaMaskConnector) {
              console.log("Auto-connecting with MetaMask");
              connect({ connector: metaMaskConnector });
            } else if (readyConnector) {
              console.log("Auto-connecting with available connector:", readyConnector.name);
              connect({ connector: readyConnector });
            } else {
              console.log("No ready connectors found for auto-connect");
              // 커넥터를 직접 특정하여 강제 연결 시도
              const anyConnector = connectors.find(c => c.id === 'injected');
              if (anyConnector) {
                console.log("Trying to connect with injected connector anyway");
                connect({ connector: anyConnector });
              }
            }
          }
        }
      } catch (error) {
        console.error("Auto-connect error:", error);
      }
    };

    // 페이지 로드 후 약간의 지연을 두고 자동 연결 시도
    const timer = setTimeout(() => {
      autoConnect();
    }, 500); // 500ms 지연

    return () => clearTimeout(timer);
  }, [connect, connectors, isConnected, isWagmiConnecting]);

  // Log available connectors on mount for debugging
  useEffect(() => {
    console.log("Available connectors:", connectors.map(c => ({
      id: c.id,
      name: c.name,
      ready: c.ready
    })));
  }, [connectors]);

  // 연결 상태 변경 시 localStorage 업데이트
  useEffect(() => {
    if (isConnected && address) {
      localStorage.setItem('connectedAddress', address);
    } else {
      localStorage.removeItem('connectedAddress');
      setAuthHeader(null);
    }
  }, [isConnected, address]);

  // 마운트 시 인증 헤더 생성 시도 (연결된 상태일 경우)
  useEffect(() => {
    // wagmi의 상태를 신뢰하고, address가 존재하고 연결된 상태일 때만 실행
    if (isConnected && address) {
      const savedAddress = localStorage.getItem('connectedAddress');
      if (address === savedAddress) {
        generateAuthHeader(address);
      }
    }
  }, [isConnected, address]); // isConnected와 address가 확정된 후 실행

  // 에러 상태 통합 관리
  useEffect(() => {
    // 에러 메시지를 설정할 때 이전 메시지보다 구체적인 것을 우선
    let currentError: string | null = null;
    if (connectError) {
      // 에러 메시지를 좀 더 사용자 친화적으로 만들 수 있음
      if (connectError.message.includes('User rejected the request')) {
        currentError = 'Connection request was rejected by the user.';
      } else {
        currentError = `Connection Error: ${connectError.message}`;
      }
    } else if (signError) {
      if (signError.message.includes('User rejected the request')) {
        currentError = 'Signature request was rejected by the user.';
      } else {
        currentError = `Signature Error: ${signError.message}`;
      }
    }
    setAppError(currentError); // 최종 에러 상태 업데이트

  }, [connectError, signError]);


  // 인증 헤더 생성
  const generateAuthHeader = useCallback(async (walletAddress: `0x${string}`) => {
    setAppError(null);
    console.log("Attempting to generate auth header..."); // 함수 호출 확인
    try {
      const timestamp = Date.now().toString();
      const message = `Authenticate for Text Battle Game: ${timestamp}`;

      // signMessageAsync 호출 및 로깅 추가
      console.log("Requesting signature for message:", message);
      const signature = await signMessageAsync({ message });
      console.log("Signature received:", signature);

      const header = `Bearer ${walletAddress}:${timestamp}:${signature}`;
      setAuthHeader(header);
      console.log("Auth Header Generated:", header);
      return header;
    } catch (error: any) { // 타입 명시
      console.error('Error generating auth header:', error);
      // 사용자가 거부한 경우 메시지 개선
      if (error.message?.includes('User rejected the request')) {
        setAppError('Signature request was rejected by the user.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to generate authentication';
        setAppError(errorMessage);
      }
      setAuthHeader(null);
      return null;
    }
  }, [signMessageAsync]); // 의존성 배열에 signMessageAsync 포함


  // 지갑 연결 함수 (개선됨)
  const connectWallet = useCallback((connectorToUse?: any) => {
    setAppError(null); // 연결 시도 시 이전 에러 초기화
    
    // 사용 가능한 connectors 모두 로깅
    console.log("All connectors:", connectors.map(c => ({
      id: c.id, 
      name: c.name, 
      ready: c.ready
    })));
    
    // 사용할 connector 결정 - 여러 옵션 시도
    let connector;
    
    // 1. 명시적으로 제공된 connector가 있으면 사용
    if (connectorToUse && connectors.includes(connectorToUse)) {
      connector = connectorToUse;
    } 
    // 2. MetaMask connector 찾기
    else {
      connector = connectors.find(c => c.id === 'injected' && c.name === 'MetaMask');
      
      // 3. 'injected' 타입의 커넥터 시도
      if (!connector) {
        connector = connectors.find(c => c.id === 'injected');
      }
      
      // 4. coinbaseWallet connector 시도
      if (!connector) {
        connector = connectors.find(c => c.id === 'coinbaseWallet');
      }
      
      // 5. walletConnect connector 시도
      if (!connector) {
        connector = connectors.find(c => c.id === 'walletConnect');
      }
      
      // 6. 그 외 모든 connector 시도
      if (!connector) {
        connector = connectors[0]; // 첫 번째 사용 가능한 커넥터 선택
      }
    }

    if (connector) {
      console.log(`Connecting with ${connector.name} (id: ${connector.id})`); // 연결 시도 로그
      connect({ connector });
    } else {
      console.log("No connectors available"); // 로그 추가
      
      // 브라우저에 이더리움 공급자가 있는지 확인
      if (typeof window !== 'undefined' && window.ethereum) {
        console.log("Found window.ethereum, but no matching connector");
        
        // 메타마스크 설치 여부 확인
        if (window.ethereum.isMetaMask) {
          setAppError("MetaMask is installed but not properly detected. Please refresh the page and try again.");
        } else {
          setAppError("A wallet is detected but not properly connected. Please refresh the page or try using a different browser.");
        }
      } else {
        setAppError("No wallet detected. Please install MetaMask or another Web3 wallet extension.");
      }
    }
  }, [connect, connectors]);


  // 사용자 생성 함수 (서버 API 호출)
  const createUser = useCallback(async (walletAddress: `0x${string}`) => {
    // 함수 호출 시 에러 상태 초기화는 필요에 따라 결정 (generateAuthHeader 등 다른 작업에서도 에러 발생 가능)
    // setAppError(null);
    console.log("Attempting to create/verify user on server..."); // 함수 호출 확인
    try {
      const timestamp = Date.now().toString();
      const message = `Register for Text Battle Game: ${timestamp}`;

      console.log("Requesting signature for user creation/verification:", message); // 서명 요청 로그
      const signature = await signMessageAsync({ message });
      console.log("Signature for user creation received:", signature); // 서명 완료 로그

      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, message, signature }),
      });

      console.log("Server response status:", response.status); // 서버 응답 상태 로그

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to parse error response from server' })); // 에러 응답 파싱 실패 대비
        console.error("Server error response:", data); // 서버 에러 상세 로그
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }
      const responseData = await response.json(); // 성공 응답 데이터 확인 (선택 사항)
      console.log("User created/verified successfully on server:", responseData);
    } catch (error: any) { // 타입 명시
      console.error('Error creating/verifying user:', error);
      // 사용자가 거부한 경우 메시지 개선
      if (error.message?.includes('User rejected the request')) {
        setAppError('Registration signature request was rejected by the user.');
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Failed to register user';
        setAppError(errorMessage);
      }
    }
  }, [signMessageAsync]); // 의존성 배열에 signMessageAsync 포함


  // 지갑 연결 성공 후 처리
  useEffect(() => {
    // isConnected 상태가 true이고, address가 유효할 때만 실행
    if (isConnected && address) {
      console.log(`Wallet connection processed for address: ${address}`);
      // 연결 시 사용자 생성/확인 및 인증 헤더 생성을 비동기로 처리
      const handleConnection = async () => {
        await createUser(address);
        // createUser에서 에러가 발생하지 않았거나, 에러 처리 정책에 따라 인증 헤더 생성 결정
        // 예를 들어, 서버 등록 실패와 관계없이 인증 헤더는 생성하도록 할 수 있음
        await generateAuthHeader(address);
      };
      handleConnection();
    }
  }, [isConnected, address, createUser, generateAuthHeader]); // 의존성 배열 확인


  // 지갑 연결 해제 함수
  const disconnectWallet = useCallback(() => {
    setAppError(null); // 연결 해제 시 에러 초기화
    disconnect();
    setAuthHeader(null);
    localStorage.removeItem('connectedAddress');
    console.log("Wallet disconnected");
  }, [disconnect]);

  // Context 값 정의
  const value: Web3ContextType = {
    address,
    isConnected,
    // isConnecting: isWagmiConnecting || isAccountConnecting || isSigning, // 여러 로딩 상태 조합 가능
    isConnecting: isWagmiConnecting, // Primarily use connection pending state
    connectWallet,
    disconnectWallet,
    authHeader,
    error: appError,
    signAuthMessage: () => {
      if (address) {
        return generateAuthHeader(address);
      } else {
        setAppError("Cannot generate auth header: Wallet not connected.");
        return Promise.resolve(null);
      }
    }
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}