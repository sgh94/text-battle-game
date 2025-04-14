'use client';

import { useWeb3 } from '@/providers/Web3Provider';
import { useState } from 'react';

export function ConnectButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWeb3();

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="flex justify-end mb-6">
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
          onClick={connect}
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
