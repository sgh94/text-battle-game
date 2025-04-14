'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  authHeader: string | null;
}

const Web3Context = createContext<Web3ContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: () => {},
  authHeader: null,
});

export const useWeb3 = () => useContext(Web3Context);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authHeader, setAuthHeader] = useState<string | null>(null);

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
      const timestamp = Date.now().toString();
      const message = `Authenticate for Text Battle Game: ${timestamp}`;
      
      // @ts-ignore
      if (typeof window.ethereum !== 'undefined') {
        // @ts-ignore
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        // @ts-ignore
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, accounts[0]],
        });
        
        const header = `Bearer ${walletAddress}:${timestamp}:${signature}`;
        setAuthHeader(header);
        return header;
      }
    } catch (error) {
      console.error('Error generating auth header:', error);
      return null;
    }
  };

  // Connect wallet
  const connect = async () => {
    try {
      setIsConnecting(true);
      
      // @ts-ignore
      if (typeof window.ethereum !== 'undefined') {
        // @ts-ignore
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        const walletAddress = accounts[0];
        setAddress(walletAddress);
        setIsConnected(true);
        localStorage.setItem('connectedAddress', walletAddress);
        
        // Create user on server
        await createUser(walletAddress);
        
        // Generate auth header
        await generateAuthHeader(walletAddress);
      } else {
        alert('Please install MetaMask or another web3 wallet');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
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
        console.error('Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    setAuthHeader(null);
    localStorage.removeItem('connectedAddress');
  };

  const value = {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    authHeader,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}
