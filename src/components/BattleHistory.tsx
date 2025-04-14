'use client';

import { useEffect, useState } from 'react';

interface Battle {
  id: string;
  character1: string;
  character2: string;
  winner: string;
  isDraw: boolean;
  explanation: string;
  narrative: string;
  timestamp: number;
}

interface BattleHistoryProps {
  characterId: string;
}

export function BattleHistory({ characterId }: BattleHistoryProps) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [characters, setCharacters] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchBattleHistory();
  }, [characterId]);

  const fetchBattleHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/battle?characterId=${characterId}&limit=10`);
      
      if (response.ok) {
        const data = await response.json();
        setBattles(data.battles || []);
        
        // Get unique character IDs from battles
        const characterIds = new Set<string>();
        data.battles.forEach((battle: Battle) => {
          characterIds.add(battle.character1);
          characterIds.add(battle.character2);
        });
        
        // Fetch character details for all characters in battles
        await fetchCharacterDetails(Array.from(characterIds));
      }
    } catch (error) {
      console.error('Error fetching battle history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCharacterDetails = async (ids: string[]) => {
    try {
      const characterDetailsMap: Record<string, any> = {};
      
      await Promise.all(
        ids.map(async (id) => {
          const response = await fetch(`/api/character/${id}`);
          
          if (response.ok) {
            const data = await response.json();
            characterDetailsMap[id] = data.character;
          }
        })
      );
      
      setCharacters(characterDetailsMap);
    } catch (error) {
      console.error('Error fetching character details:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4">배틀 히스토리</h3>
        <div className="flex justify-center my-4">
          <svg className="animate-spin h-6 w-6 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">배틀 히스토리</h3>
      
      {battles.length === 0 ? (
        <div className="bg-gray-800 p-4 rounded-lg text-center">
          <p>No battles yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {battles.map((battle) => {
            const char1 = characters[battle.character1];
            const char2 = characters[battle.character2];
            const result = battle.isDraw ? 'Draw' : (battle.winner === characterId ? 'Win' : 'Loss');
            const resultClass = battle.isDraw ? 'text-gray-400' : (battle.winner === characterId ? 'text-green-500' : 'text-red-500');
            
            // Use narrative if available, otherwise fall back to explanation
            const battleDescription = battle.narrative || battle.explanation;
            
            return (
              <div key={battle.id} className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${resultClass}`}>{result}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-400">{formatDate(battle.timestamp)}</span>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between">
                    <div>
                      <span className="font-medium">{char1?.name || 'Unknown'}</span>
                      {battle.character1 === characterId && <span className="text-xs ml-1">(You)</span>}
                    </div>
                    <div>VS</div>
                    <div>
                      <span className="font-medium">{char2?.name || 'Unknown'}</span>
                      {battle.character2 === characterId && <span className="text-xs ml-1">(You)</span>}
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-300">
                  <p>{battleDescription}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
