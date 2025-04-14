'use client';

import { useWeb3 } from '@/providers/Web3Provider';
import { useState, useEffect } from 'react';
import { useConnect } from 'wagmi';

export function ConnectButton() {
  const { address, isConnected, isConnecting, connectWallet, disconnectWallet, error } = useWeb3();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { connectors } = useConnect();

  // Update local error state when context error changes
  useEffect(() => {
    // 에러 메시지가 변경될 때 업데이트 (context의 error를 직접 사용)
    setErrorMessage(error);

    // 에러 메시지가 있으면 5초 후 자동으로 숨김 (선택적 UX 개선)
    if (error) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer); // 컴포넌트 언마운트 시 타이머 클리어
    }
  }, [error]); // context의 error가 변경될 때마다 실행

  const formatAddress = (addr: string | undefined) => {
    // address가 undefined일 수 있으므로 처리 추가
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // 지갑 연결 함수
  const handleConnectClick = () => {
    try {
      // 연결 시도 시 이전 에러 메시지 초기화
      setErrorMessage(null);
      
      // 연결 시도 전에 현재 이더리움 환경 정보 로깅
      if (typeof window !== 'undefined') {
        console.log("Browser environment:", {
          userAgent: navigator.userAgent,
          language: navigator.language,
        });
        
        if (window.ethereum) {
          console.log("Ethereum provider info:", {
            isMetaMask: window.ethereum.isMetaMask,
            isCoinbaseWallet: window.ethereum.isCoinbaseWallet,
            selectedAddress: window.ethereum.selectedAddress,
            networkVersion: window.ethereum.networkVersion,
            chainId: window.ethereum.chainId,
          });
        } else {
          console.log("No Ethereum provider available in window");
        }
      }
      
      // 지갑 설치 확인
      const hasProvider = typeof window !== 'undefined' && (
        typeof window.ethereum !== 'undefined' || 
        typeof window.web3 !== 'undefined'
      );
      
      if (!hasProvider) {
        // 지갑이 설치되지 않은 경우 MetaMask 설치 페이지로 이동 제안
        setErrorMessage(
          "웹3 지갑이 설치되어 있지 않습니다. MetaMask를 설치하시겠습니까?"
        );
        
        // MetaMask 설치 버튼 표시 로직 추가 가능
        return;
      }
      
      // 지갑 연결 시도
      connectWallet();
    } catch (err) {
      console.error("Connection attempt error:", err);
      setErrorMessage("지갑 연결 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  // 설치된 지갑이 있는지 확인
  const hasWallet = typeof window !== 'undefined' && (
    typeof window.ethereum !== 'undefined' || 
    typeof window.web3 !== 'undefined'
  );

  return (
    <div className="flex flex-col items-end mb-6">
      {/* 에러 메시지 표시 */}
      {errorMessage && (
        <div className="mb-2 p-2 bg-red-600 text-white text-sm rounded-md animate-pulse">
          {errorMessage}
          {!hasWallet && errorMessage.includes("MetaMask를 설치") && (
            <a 
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline font-bold"
            >
              설치하기
            </a>
          )}
        </div>
      )}

      {isConnected && address ? (
        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow">
          <span className="bg-green-500 rounded-full w-2.5 h-2.5 block animate-pulse"></span>
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{formatAddress(address)}</span>
          <button
            onClick={disconnectWallet}
            className="ml-2 bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnectClick}
          disabled={isConnecting}
          className={`bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-opacity duration-200 ${isConnecting ? 'opacity-70 cursor-not-allowed' : 'opacity-100'}`}
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              연결 중...
            </>
          ) : (
            '지갑 연결'
          )}
        </button>
      )}
    </div>
  );
}