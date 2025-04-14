'use client';

import { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton as RainbowKitConnectButton } from '@rainbow-me/rainbowkit';
import { useWalletErrorState } from '@/lib/atoms/wallet';

export function ConnectButton() {
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useWalletErrorState();

  // Check component mount for client side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle SSR
  if (!mounted) return null;

  return (
    <div className="flex flex-col items-end mb-6">
      {/* Display error message */}
      {errorMessage && (
        <div className="mb-2 p-2 bg-red-600 text-white text-sm rounded-md animate-pulse">
          {errorMessage}
        </div>
      )}

      {/* RainbowKit custom connect button */}
      <RainbowKitConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          authenticationStatus,
          mounted: rainbowKitMounted,
        }) => {
          // Check mount and authentication status
          const ready = rainbowKitMounted && authenticationStatus !== 'loading';
          const connected =
            ready &&
            account &&
            chain &&
            (!authenticationStatus || authenticationStatus === 'authenticated');

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button 
                      onClick={openConnectModal} 
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-opacity duration-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 5a2 2 0 012-2h1a1 1 0 010 2H5v13h14V5h-1a1 1 0 110-2h1a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" clipRule="evenodd" />
                        <path d="M10 4a1 1 0 00-1 1v4H7a1 1 0 100 2h2v4a1 1 0 102 0v-4h2a1 1 0 100-2h-2V5a1 1 0 00-1-1z" />
                      </svg>
                      Connect Wallet
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg shadow">
                    <button 
                      onClick={openChainModal} 
                      className="flex items-center bg-gray-200 dark:bg-gray-600 rounded px-2 py-1 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      {chain.hasIcon && (
                        <div
                          className="mr-1 w-4 h-4 rounded-full overflow-hidden"
                          style={{
                            background: chain.iconBackground,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 16, height: 16 }}
                            />
                          )}
                        </div>
                      )}
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        {chain.name}
                      </span>
                    </button>

                    <button 
                      onClick={openAccountModal} 
                      className="flex items-center bg-gray-200 dark:bg-gray-600 rounded px-2 py-1 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      <span className="bg-green-500 rounded-full w-2.5 h-2.5 block animate-pulse mr-2"></span>
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ''}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </RainbowKitConnectButton.Custom>
    </div>
  );
}
