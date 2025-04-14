'use client';

import { useWeb3 } from '@/providers/Web3Provider';
import { useState, useEffect } from 'react';

export function ConnectButton() {
  const { address, isConnected, isConnecting, connect, disconnect, error } = useWeb3();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Update local error state when context error changes
  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      // Clear error after 5 seconds
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    // @ts-ignore
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  return (
    <div className="flex flex-col items-end mb-6">
      {errorMessage && (
        <div className="mb-2 p-2 bg-red-600 text-white text-sm rounded-md">
          {errorMessage}
        </div>
      )}
      
      {isConnected ? (
        <div className="flex items-center gap-2">
          <span className="bg-green-500 rounded-full w-2 h-2"></span>
          <span className="text-sm">{formatAddress(address || '')}</span>
          <button
            onClick={disconnect}
            className="ml-2 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            if (!isMetaMaskInstalled()) {
              setErrorMessage('Please install MetaMask to connect');
              return;
            }
            connect();
          }}
          disabled={isConnecting}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
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
