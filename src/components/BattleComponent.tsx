'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/providers/Web3Provider';
import Link from 'next/link';

interface Character {
  id: string;
  name: string;
  traits: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

export function BattleComponent() {
  const { address, isConnected, authHeader } = useWeb3();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [opponent, setOpponent] = useState<any>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [cooldownTimer, setCooldownTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchCharacters();
      checkCooldown();
    } else {
      setCharacters([]);
    }
    
    return () => {
      if (cooldownTimer) clearInterval(cooldownTimer);
    };
  }, [isConnected, address]);

  const fetchCharacters = async () => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/character?address=${address}`);
      
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
        
        // Auto-select the first character if none is selected
        if (data.characters?.length > 0 && !selectedCharacter) {
          setSelectedCharacter(data.characters[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkCooldown = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/user/cooldown?address=${address}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.cooldown > 0) {
          setCooldown(data.cooldown);
          startCooldownTimer(data.cooldown);
        } else {
          setCooldown(null);
        }
      }
    } catch (error) {
      console.error('Error checking cooldown:', error);
    }
  };

  const startCooldownTimer = (seconds: number) => {
    if (cooldownTimer) clearInterval(cooldownTimer);
    
    setCooldown(seconds);
    
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    
    setCooldownTimer(timer);
  };

  const startBattle = async () => {
    if (!authHeader || !selectedCharacter || isBattling) return;
    
    try {
      setIsBattling(true);
      setBattleResult(null);
      setOpponent(null);
      
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ characterId: selectedCharacter }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429 && data.error) {
          // Cooldown active
          const match = data.error.match(/(\\d+)\\s+seconds/);
          if (match && match[1]) {
            startCooldownTimer(parseInt(match[1]));
          }
          throw new Error(data.error);
        }
        throw new Error(data.error || 'Battle failed');
      }
      
      // Get opponent character details
      const opponentId = data.battle.character1 === selectedCharacter 
        ? data.battle.character2 
        : data.battle.character1;
        
      const opponentResponse = await fetch(`/api/character/${opponentId}`);
      if (opponentResponse.ok) {
        const opponentData = await opponentResponse.json();
        setOpponent(opponentData.character);
      }
      
      // Set battle result
      setBattleResult(data.battle);
      
      // Refresh characters to update ELO
      fetchCharacters();
      
      // Start cooldown
      startCooldownTimer(180); // 3 minutes
    } catch (error: any) {
      console.error('Battle error:', error);
      alert(error.message || 'Failed to start battle');
    } finally {
      setIsBattling(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="mt-8 text-center">
        <p>Connect your wallet to battle with your characters</p>
        <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
          Go to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-6">Practice Battle</h2>
      
      {isLoading ? (
        <div className="flex justify-center my-8">
          <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : characters.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p>You don't have any characters yet.</p>
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
            Create a character
          </Link>
        </div>
      ) : (
        <div>
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium mb-4">Select Character</h3>
            
            <select
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="w-full bg-gray-700 rounded-md border border-gray-600 px-3 py-2 mb-4"
            >
              {characters.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name} - {char.elo} Elo
                </option>
              ))}
            </select>
            
            <button
              onClick={startBattle}
              disabled={isBattling || !selectedCharacter || cooldown !== null}
              className={`w-full py-3 rounded-md font-bold ${cooldown !== null
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isBattling ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Battle in progress...
                </div>
              ) : cooldown !== null ? (
                `Cooldown... ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}`
              ) : (
                'Start Battle'
              )}
            </button>
          </div>
          
          {battleResult && opponent && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">Battle Result</h3>
              
              <div className="flex justify-between items-center mb-6">
                <div className="text-center flex-1">
                  <div className="font-bold text-lg">
                    {characters.find(c => c.id === selectedCharacter)?.name}
                  </div>
                  <div className="text-sm text-gray-400">
                    {characters.find(c => c.id === selectedCharacter)?.elo} Elo
                  </div>
                </div>
                
                <div className="mx-4 font-bold text-2xl">VS</div>
                
                <div className="text-center flex-1">
                  <div className="font-bold text-lg">{opponent.name}</div>
                  <div className="text-sm text-gray-400">{opponent.elo} Elo</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-center text-xl font-bold mb-2">
                  {battleResult.isDraw ? (
                    <span className="text-gray-400">Draw!</span>
                  ) : battleResult.winner === selectedCharacter ? (
                    <span className="text-green-500">Victory!</span>
                  ) : (
                    <span className="text-red-500">Defeat!</span>
                  )}
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p>{battleResult.explanation}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
