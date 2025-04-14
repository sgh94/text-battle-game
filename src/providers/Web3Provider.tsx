'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage
} from 'wagmi';
// import { InjectedConnector } from 'wagmi/connectors/injected'; // <<<--- 이 줄을 삭제하세요

interface Web3ContextType {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  // isConnecting: boolean; // isPending으로 대체될 수 있으므로 잠시 주석 처리 또는 isWagmiConnecting 사용
  isConnecting: boolean; // <<<--- isWagmiConnecting으로 관리
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
  const { address, isConnected, isConnecting: isAccountConnecting, connector: activeConnector } = useAccount(); // useAccount의 isConnecting도 있음
  // useConnect 훅에서 isLoading 대신 isPending 사용
  const { connect, connectors, error: connectError, isPending: isWagmiConnecting } = useConnect(); // <<<--- isLoading을 isPending으로 변경
  const { disconnect } = useDisconnect();
  const { signMessageAsync, error: signError, isPending: isSigning } = useSignMessage(); // useSignMessage는 isLoading 유지

  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [appError, setAppError] = useState<string | null>(null);

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


  // 지갑 연결 함수
  const connectWallet = useCallback((connectorToUse?: any) => {
    setAppError(null); // 연결 시도 시 이전 에러 초기화
    const connector = connectorToUse || connectors.find(c => c.ready && c.id === 'injected') || connectors.find(c => c.ready); // 사용 가능(ready)한 커넥터 우선 찾기
    if (connector) {
      console.log(`Connecting with ${connector.name}...`); // 연결 시도 로그
      connect({ connector });
    } else {
      console.log("No suitable ready connector found."); // 로그 추가
      setAppError("No suitable wallet connector found or ready. Please install MetaMask, ensure your wallet is unlocked, or use another supported wallet.");
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