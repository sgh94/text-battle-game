'use client';

import { useWeb3 } from '@/providers/Web3Provider';
import { useState, useEffect } from 'react';

export function ConnectButton() {
  // 1. useWeb3 훅 구조 분해 할당 수정: connect -> connectWallet, disconnect -> disconnectWallet
  const { address, isConnected, isConnecting, connectWallet, disconnectWallet, error } = useWeb3();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // 2. isMetaMaskInstalled 함수 제거 (wagmi가 다양한 지갑 처리)
  // const isMetaMaskInstalled = () => { ... }; // 이 함수는 더 이상 필요하지 않습니다.

  const handleConnectClick = () => {
    // 연결 시도 시 이전 에러 메시지 초기화 (선택적)
    setErrorMessage(null);
    // 3. connect() 대신 connectWallet() 호출
    connectWallet(); // connectWallet은 내부적으로 사용 가능한 커넥터(MetaMask, WalletConnect 등)를 찾아 연결 시도
  };

  return (
    <div className="flex flex-col items-end mb-6">
      {/* Context의 error 상태를 직접 사용하여 에러 메시지 표시 */}
      {errorMessage && (
        <div className="mb-2 p-2 bg-red-600 text-white text-sm rounded-md animate-pulse"> {/* 에러 시 약간의 애니메이션 추가 */}
          {errorMessage}
        </div>
      )}

      {isConnected && address ? ( // address도 존재하는지 확인
        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow"> {/* 연결 시 스타일 개선 */}
          <span className="bg-green-500 rounded-full w-2.5 h-2.5 block animate-pulse"></span> {/* 녹색 점 깜빡임 */}
          <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{formatAddress(address)}</span>
          <button
            // 4. disconnect() 대신 disconnectWallet() 호출
            onClick={disconnectWallet}
            className="ml-2 bg-red-500 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors duration-200"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          // 5. onClick 핸들러에서 connectWallet 호출 (MetaMask 특정 로직 제거)
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