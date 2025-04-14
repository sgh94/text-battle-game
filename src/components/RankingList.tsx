'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Character {
  id: string;
  name: string;
  owner: string;
  elo: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
}

export function RankingList() {
  const [rankings, setRankings] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ranking?limit=10');
      
      if (response.ok) {
        const data = await response.json();
        setRankings(data.rankings || []);
      }
    } catch (error) {
      console.error('Error fetching rankings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Format owner address
  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-4">Rankings</h2>

      {isLoading ? (
        <div className="flex justify-center my-8">
          <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p>No rankings available yet</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Character</th>
                <th className="px-4 py-2 text-left">Owner</th>
                <th className="px-4 py-2 text-right">Elo</th>
                <th className="px-4 py-2 text-right">W/L/D</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((character) => (
                <tr key={character.id} className="border-t border-gray-700 hover:bg-gray-700 transition">
                  <td className="px-4 py-3">{character.rank}</td>
                  <td className="px-4 py-3">
                    <Link href={`/character/${character.id}`} className="text-purple-400 hover:text-purple-300">
                      {character.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{formatAddress(character.owner)}</td>
                  <td className="px-4 py-3 text-right font-bold">{character.elo}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    <span className="text-green-500">{character.wins}</span>/
                    <span className="text-red-500">{character.losses}</span>/
                    <span className="text-gray-400">{character.draws}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
