'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  authHeader: string | null;
  error: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  authHeader: null,
  error: null,
});

export const useWeb3 = () => useContext(Web3Context);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    // @ts-ignore
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  };

  // Restore connection from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('connectedAddress');
    if (savedAddress) {
      setAddress(savedAddress);
      setIsConnected(true);
      generateAuthHeader(savedAddress);
    }
  }, []);

  // Generate auth header for API requests
  const generateAuthHeader = async (walletAddress: string) => {
    try {
      if (!isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed');
      }

      const timestamp = Date.now().toString();
      const message = `Authenticate for Text Battle Game: ${timestamp}`;
      
      // @ts-ignore
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      // @ts-ignore
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, accounts[0]],
      });
      
      const header = `Bearer ${walletAddress}:${timestamp}:${signature}`;
      setAuthHeader(header);
      return header;
    } catch (error) {
      console.error('Error generating auth header:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate authentication');
      return null;
    }
  };

  // Connect wallet
  const connect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      if (!isMetaMaskInstalled()) {
        throw new Error('Please install MetaMask or another web3 wallet');
      }
      
      // @ts-ignore
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }
      
      const walletAddress = accounts[0];
      setAddress(walletAddress);
      setIsConnected(true);
      localStorage.setItem('connectedAddress', walletAddress);
      
      // Create user on server
      await createUser(walletAddress);
      
      // Generate auth header
      await generateAuthHeader(walletAddress);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect wallet');
      setIsConnected(false);
      setAddress(null);
      localStorage.removeItem('connectedAddress');
    } finally {
      setIsConnecting(false);
    }
  };

  // Create user on server
  const createUser = async (walletAddress: string) => {
    try {
      // Get signature for user creation
      const timestamp = Date.now().toString();
      const message = `Register for Text Battle Game: ${timestamp}`;
      
      // @ts-ignore
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });
      
      // Send to server
      const response = await fetch('/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: walletAddress,
          message,
          signature,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error instanceof Error ? error.message : 'Failed to register user');
    }
  };

  // Setup MetaMask account change listener
  useEffect(() => {
    if (!isMetaMaskInstalled()) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        disconnect();
      } else if (accounts[0] !== address) {
        // User switched accounts
        setAddress(accounts[0]);
        localStorage.setItem('connectedAddress', accounts[0]);
        generateAuthHeader(accounts[0]);
      }
    };

    // @ts-ignore
    window.ethereum?.on('accountsChanged', handleAccountsChanged);

    return () => {
      // @ts-ignore
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, [address]);

  // Disconnect wallet
  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setAuthHeader(null);
    setError(null);
    localStorage.removeItem('connectedAddress');
  };

  const value = {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    authHeader,
    error,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}
