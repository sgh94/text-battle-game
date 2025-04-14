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

  // 지갑 연결 함수 개선
  const handleConnectClick = () => {
    try {
      // 연결 시도 시 이전 에러 메시지 초기화
      setErrorMessage(null);
      
      // 사용 가능한 connectors 로깅
      console.log("Available connectors:", connectors.map(c => ({
        id: c.id,
        name: c.name,
        ready: c.ready
      })));
      
      // MetaMask 설치 상태 확인 (window.ethereum이 존재하는지)
      const hasEthereum = typeof window !== 'undefined' && 
                           typeof window.ethereum !== 'undefined';
      
      // Ethereum 환경 상태 확인 로깅
      console.log("Ethereum environment:", {
        hasEthereum,
        isMetaMaskAvailable: hasEthereum && (window.ethereum.isMetaMask || false),
        providers: hasEthereum && window.ethereum.providers ? window.ethereum.providers.length : 'N/A'
      });
      
      // connectors 상태에 따라 적절한 메시지 표시
      if (!connectors.some(c => c.ready)) {
        console.log("No connectors are ready");
        // MetaMask가 설치되지 않은 경우
        if (!hasEthereum) {
          setErrorMessage("No wallet extension detected. Please install MetaMask or another wallet extension.");
          return;
        }
        // MetaMask가 잠긴 경우
        else if (hasEthereum && window.ethereum.isMetaMask && !window.ethereum._metamask?.isUnlocked) {
          setErrorMessage("Your MetaMask is locked. Please unlock it to continue.");
          return;
        }
      }
      
      // 다양한 지갑 연결 시도
      connectWallet();
    } catch (err) {
      console.error("Error in handleConnectClick:", err);
      setErrorMessage("Failed to connect wallet. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-end mb-6">
      {/* 에러 메시지 표시 */}
      {errorMessage && (
        <div className="mb-2 p-2 bg-red-600 text-white text-sm rounded-md animate-pulse">
          {errorMessage}
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
              Connecting...
            </>
          ) : (
            'Connect Wallet'
          )}
        </button>
      )}
    </div>
  );
}