'use client';

import { useWeb3 } from '@/providers/Web3Provider';
import { useState, useEffect } from 'react';
import { useConnect } from 'wagmi';
import { WalletModal } from './WalletModal';

export function ConnectButton() {
  const { address, isConnected, isConnecting, disconnectWallet, error } = useWeb3();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
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

  // 지갑 모달 열기
  const handleOpenWalletModal = () => {
    // 연결 시도 시 이전 에러 메시지 초기화
    setErrorMessage(null);
    setIsWalletModalOpen(true);
    
    // 환경 로깅 (디버깅 도움)
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
  };

  // 지갑 모달 닫기
  const handleCloseWalletModal = () => {
    setIsWalletModalOpen(false);
  };

  const formatAddress = (addr: string | undefined) => {
    // address가 undefined일 수 있으므로 처리 추가
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <>
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
              연결 해제
            </button>
          </div>
        ) : (
          <button
            onClick={handleOpenWalletModal}
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
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a2 2 0 012-2h1a1 1 0 010 2H5v13h14V5h-1a1 1 0 110-2h1a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" clipRule="evenodd" />
                  <path d="M10 4a1 1 0 00-1 1v4H7a1 1 0 100 2h2v4a1 1 0 102 0v-4h2a1 1 0 100-2h-2V5a1 1 0 00-1-1z" />
                </svg>
                지갑 연결
              </>
            )}
          </button>
        )}
      </div>

      {/* 지갑 선택 모달 */}
      <WalletModal 
        isOpen={isWalletModalOpen} 
        onClose={handleCloseWalletModal}
      />
    </>
  );
}