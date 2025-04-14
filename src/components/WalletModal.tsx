'use client';

import { useEffect } from 'react';
import { useConnect } from 'wagmi';
import { useWeb3 } from '@/providers/Web3Provider';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectWallet } = useWeb3();
  const { connectors, isPending, error } = useConnect();

  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 모달 바깥 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 지갑 항목 클릭 시 연결 시도
  const handleConnectWallet = (connector: any) => {
    connectWallet(connector);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">지갑 연결</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error.message}
          </div>
        )}
        
        <div className="space-y-3">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnectWallet(connector)}
              disabled={isPending || !connector.ready}
              className={`
                w-full flex items-center justify-between p-3 rounded-lg border 
                transition-colors duration-200
                ${connector.ready 
                  ? 'border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700' 
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60 cursor-not-allowed'}
              `}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 flex items-center justify-center mr-4 rounded-full bg-gray-100 dark:bg-gray-700">
                  {connector.id === 'injected' && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="#E2761B" d="M3.048 0l7.879 5.858L9.845 2.72 3.048 0zm18.6 0l-7.834 2.787.918 3.138L21.647 0zM12.578 17.236v-3.903l-2.57-.75v5.053l2.57-.4zm.55 0l2.57-.4v-5.053l-2.57.75v3.903zm-3.1-5.537l-2.363-1.11-.664 1.798 2.637.768.391-1.455zm3.522-4.037l-8.178-3.8L0 16.83l7.45 3.873.022-4.65 4.957-3.215-.679-5.177zm7.015 1.11l-2.362 1.11.39 1.455 2.636-.768-.664-1.798zM16.303 3.86l-8.177 3.8-.68 5.177 4.958 3.216.022 4.65L19.874 16.8 16.303 3.86zm-5.37 7.03l-2.228-1.034-1.79.8 2.228 1.034 1.79-.8zm.46 0l1.79.8 2.228-1.034-1.79-.8-2.228 1.034zM14.49 4.75l-5.87-3.4-1.05 5.7 5.87 3.4 1.05-5.7z"></path></svg>
                  )}
                  {connector.id === 'walletConnect' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 12.4438C8.95342 9.44908 13.0457 9.44908 16 12.4438L16.7781 13.2286C16.9212 13.3734 16.9211 13.6068 16.7779 13.7515L15.5558 14.9876C15.4838 15.0604 15.3695 15.0604 15.2975 14.9876L14.2467 13.9243C12.1175 11.766 9.88253 11.766 7.7533 13.9243L6.64921 15.0413C6.57729 15.1141 6.46299 15.1141 6.39097 15.0413L5.16895 13.8054C5.02567 13.6608 5.02567 13.4274 5.16886 13.2827L6 12.4438Z" fill="#3B99FC"></path><path d="M19.4383 9.0562C22.4639 12.1123 22.4639 17.0092 19.4383 20.0651C16.4127 23.121 11.5864 23.121 8.56078 20.0649C5.5352 17.009 5.5352 12.1121 8.56078 9.05605L9.96175 7.64087C10.1051 7.4964 10.3383 7.49639 10.4816 7.64088L11.7041 8.87665C11.7761 8.94946 11.7761 9.06371 11.7041 9.13642L10.3034 10.5512C8.3308 12.5449 8.3308 15.7791 10.3034 17.7728C12.2762 19.7663 15.4755 19.7663 17.4483 17.7728C19.4211 15.7792 19.4211 12.545 17.4483 10.5515L16.0396 9.1289C15.9675 9.05605 15.9675 8.9418 16.0396 8.86919L17.2624 7.63342C17.4058 7.48895 17.639 7.48894 17.7824 7.63339L19.4383 9.0562Z" fill="#3B99FC"></path></svg>
                  )}
                  {connector.id === 'coinbaseWallet' && (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="22" height="22" rx="11" fill="#0052FF"></rect><path d="M12.0001 5.6665C8.49992 5.6665 5.66675 8.49967 5.66675 11.9998C5.66675 15.5 8.49992 18.3332 12.0001 18.3332C15.5002 18.3332 18.3334 15.5 18.3334 11.9998C18.3334 8.49967 15.5002 5.6665 12.0001 5.6665ZM14.5001 12.5831H12.5834V14.4998C12.5834 14.7165 12.4167 14.9165 12.1667 14.9165H11.8334C11.6167 14.9165 11.4167 14.7498 11.4167 14.4998V12.5831H9.50008C9.28341 12.5831 9.08341 12.4165 9.08341 12.1665V11.8332C9.08341 11.6165 9.25008 11.4165 9.50008 11.4165H11.4167V9.49984C11.4167 9.28317 11.5834 9.08317 11.8334 9.08317H12.1667C12.3834 9.08317 12.5834 9.24984 12.5834 9.49984V11.4165H14.5001C14.7167 11.4165 14.9167 11.5832 14.9167 11.8332V12.1665C14.9167 12.3832 14.7501 12.5831 14.5001 12.5831Z" fill="white"></path></svg>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{connector.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {connector.ready ? '연결 가능' : '설치가 필요합니다'}
                  </div>
                </div>
              </div>
              
              {isPending && (
                <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full"></div>
              )}
            </button>
          ))}
          
          {/* 지갑이 없는 경우 설치 안내 */}
          {connectors.length === 0 || !connectors.some(c => c.ready) ? (
            <div className="mt-4 text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-2">아직 지갑이 없으신가요?</p>
              <div className="flex justify-center space-x-3">
                <a 
                  href="https://metamask.io/download/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 flex items-center"
                >
                  <span>MetaMask 설치</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a 
                  href="https://wallet.coinbase.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 flex items-center"
                >
                  <span>Coinbase Wallet 설치</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
