'use client';

import { useEffect, useState } from 'react';
import { useWeb3 } from '@/providers/Web3Provider';
import { BattleHistory } from './BattleHistory';
import Link from 'next/link';

interface Character {
  id: string;
  name: string;
  traits: string;
  owner: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

interface CharacterDetailProps {
  id: string;
}

export function CharacterDetail({ id }: CharacterDetailProps) {
  const { address, isConnected, authHeader } = useWeb3();
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [cooldownTimer, setCooldownTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchCharacter();
    return () => {
      if (cooldownTimer) clearInterval(cooldownTimer);
    };
  }, [id]);

  const fetchCharacter = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await fetch(`/api/character/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch character');
      }
      
      const data = await response.json();
      setCharacter(data.character);
      
      // Check if there's an active cooldown
      if (isConnected && address) {
        checkCooldown();
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCooldown = async () => {
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
    if (!authHeader || !character || isBattling) return;
    
    try {
      setIsBattling(true);
      setBattleResult(null);
      
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({ characterId: id }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429 && data.error) {
          // Cooldown active
          const match = data.error.match(/(\d+)\s+seconds/);
          if (match && match[1]) {
            startCooldownTimer(parseInt(match[1]));
          }
          throw new Error(data.error);
        }
        throw new Error(data.error || 'Battle failed');
      }
      
      // Update character with new ELO
      if (data.updatedStats) {
        if (data.battle.winner === character.id) {
          setCharacter(data.updatedStats.winner);
        } else if (data.battle.isDraw) {
          // In case of draw, check which one is our character
          if (data.battle.character1 === character.id) {
            setCharacter(data.updatedStats.winner); // Using "winner" since it represents character1 in a draw
          } else {
            setCharacter(data.updatedStats.loser); // Using "loser" since it represents character2 in a draw
          }
        } else {
          setCharacter(data.updatedStats.loser);
        }
      }
      
      // Set battle result
      setBattleResult(data.battle);
      
      // Start cooldown
      startCooldownTimer(180); // 3 minutes
    } catch (error: any) {
      console.error('Battle error:', error);
      alert(error.message || 'Failed to start battle');
    } finally {
      setIsBattling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center my-8">
        <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="bg-red-900/30 border border-red-500 p-4 rounded-lg">
        <p>{error || 'Character not found'}</p>
        <Link href="/" className="text-blue-400 hover:underline mt-2 inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

  const isOwner = isConnected && address?.toLowerCase() === character.owner.toLowerCase();

  return (
    <div>
      <div className="mb-4">
        <Link href="/" className="text-blue-400 hover:underline">&larr; Back to My Characters</Link>
      </div>
      
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold">{character.name}</h2>
          <div className="text-right">
            <div className="text-xl font-bold">{character.elo} Elo</div>
            <div className="text-sm text-gray-400">
              {character.wins}승 {character.losses}패 {character.draws}무
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-gray-400 mb-2">특성</h3>
          <p className="whitespace-pre-line">{character.traits}</p>
        </div>
        
        {isOwner && (
          <div className="mt-6">
            <button
              onClick={startBattle}
              disabled={isBattling || cooldown !== null}
              className={`w-full py-3 rounded-md font-bold text-center ${cooldown !== null
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {isBattling ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  배틀 진행 중...
                </div>
              ) : cooldown !== null ? (
                `대기 중... ${Math.floor(cooldown / 60)}:${(cooldown % 60).toString().padStart(2, '0')}`
              ) : (
                '배틀 시작'
              )}
            </button>
          </div>
        )}
        
        {battleResult && (
          <div className="mt-6 bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-bold mb-2">배틀 결과</h3>
            <p className="mb-4">
              {battleResult.isDraw 
                ? '무승부!' 
                : battleResult.winner === character.id 
                  ? '승리!' 
                  : '패배!'}
            </p>
            <p className="text-gray-300">{battleResult.explanation}</p>
          </div>
        )}
      </div>
      
      <BattleHistory characterId={id} />
    </div>
  );
}
