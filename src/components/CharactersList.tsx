'use client';

import { useEffect, useState } from 'react';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import Link from 'next/link';
import { CreateCharacterModal } from './CreateCharacterModal';

interface Character {
  id: string;
  name: string;
  traits: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
}

export function CharactersList() {
  const { user, isConnected } = useDiscordAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Fetch characters when connected
  useEffect(() => {
    if (isConnected && user?.id) {
      fetchCharacters();
    } else {
      setCharacters([]);
    }
  }, [isConnected, user?.id]);

  const fetchCharacters = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/character?userId=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateButtonClick = () => {
    setShowModal(true);
  };

  const handleCreateSuccess = () => {
    setShowModal(false);
    fetchCharacters();
  };

  if (!isConnected) {
    return (
      <div className="mt-8 text-center">
        <p>Connect with Discord to view your characters</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">My Characters</h2>
        {characters.length < 1 && ( // 계정당 하나의 캐릭터 제한
          <button
            onClick={handleCreateButtonClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-sm"
          >
            Add Character
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center my-8">
          <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : characters.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p>No characters yet. Create your first character!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {characters.map((character) => (
            <Link key={character.id} href={`/character/${character.id}`}>
              <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition cursor-pointer">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-lg">{character.name}</h3>
                    <p className="text-gray-400 truncate max-w-md">{character.traits}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{character.elo} Elo</div>
                    <div className="text-sm text-gray-400">
                      {character.wins}W {character.losses}L {character.draws}D
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <CreateCharacterModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </div>
  );
}
