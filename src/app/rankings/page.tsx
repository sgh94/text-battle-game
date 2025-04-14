'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RankedCharacter {
  id: string;
  name: string;
  owner: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
}

export default function Rankings() {
  const [topCharacters, setTopCharacters] = useState<RankedCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopCharacters();
  }, []);

  const fetchTopCharacters = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ranking?limit=10');

      if (!response.ok) {
        throw new Error('Failed to fetch rankings');
      }

      const data = await response.json();
      setTopCharacters(data.rankings || []);
    } catch (error) {
      console.error('Error fetching top characters:', error);
      setError('Failed to load rankings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 pb-20">
      <h1 className="text-3xl font-bold mb-2">Text Battle</h1>
      <h2 className="text-xl font-medium mb-6">Total Rankings TOP 10</h2>

      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <Link href="/" className="text-blue-400 hover:underline">&larr; Back to Main</Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center my-8">
            <svg className="animate-spin h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : error ? (
          <div className="bg-red-900/30 border border-red-500 p-4 rounded-lg">
            <p>{error}</p>
          </div>
        ) : topCharacters.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <p>No ranked characters found.</p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-700">
                  <th className="py-3 px-4 text-left">Rank</th>
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-right">Elo</th>
                  <th className="py-3 px-4 text-right">W/L/D</th>
                </tr>
              </thead>
              <tbody>
                {topCharacters.map((character) => (
                  <tr key={character.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <span className="font-bold w-6 text-center">
                          {character.rank <= 3 ? (
                            <span className={character.rank === 1 ? "text-yellow-400" : character.rank === 2 ? "text-gray-300" : "text-yellow-600"}>
                              #{character.rank}
                            </span>
                          ) : (
                            `#${character.rank}`
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/character/${character.id}`}>
                        <span className="hover:text-blue-400 hover:underline">{character.name}</span>
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-right">{character.elo}</td>
                    <td className="py-3 px-4 text-right">
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
    </main>
  );
}
