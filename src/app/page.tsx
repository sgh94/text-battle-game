'use client';

import { ConnectButton } from '@/components/ConnectButton';
import { CharactersList } from '@/components/CharactersList';
import { useState, useEffect } from 'react';

export default function Home() {
  const [isClient, setIsClient] = useState(false);
  
  // This ensures hydration issues are avoided
  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 pb-20">
      <h1 className="text-3xl font-bold mb-8">Text Battle</h1>
      
      <div className="w-full max-w-2xl">
        {isClient && <ConnectButton />}
        <CharactersList />
      </div>
    </main>
  );
}
