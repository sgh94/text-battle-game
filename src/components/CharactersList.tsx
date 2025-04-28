'use client';

import { useEffect, useState } from 'react';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import Link from 'next/link';
import { CreateCharacterModal } from './CreateCharacterModal';
import { getLeagueInfo } from '@/lib/discord-roles';

interface Character {
  id: string;
  name: string;
  traits: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  league: string;
  owner: string;
}

export function CharactersList() {
  const { user, isConnected } = useDiscordAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string | null>(null);

  // Map to keep track of which leagues the user already has characters in
  const [leagueCharacters, setLeagueCharacters] = useState<Record<string, Character | null>>({});

  // Fetch characters when connected
  useEffect(() => {
    if (isConnected && user?.id) {
      fetchCharacters();
    } else {
      setCharacters([]);
      setLeagueCharacters({});
    }
  }, [isConnected, user?.id]);

  const fetchCharacters = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      console.log(`Fetching characters for user ID: ${user.id}`);
      
      // Use address parameter with the user ID
      const response = await fetch(`/api/character?address=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Characters fetched:', data.characters);
        const fetchedCharacters = data.characters || [];
        setCharacters(fetchedCharacters);
        
        // Group characters by league
        const charactersByLeague: Record<string, Character | null> = {};
        
        // Initialize with null for all available leagues
        if (user.leagues) {
          user.leagues.forEach(league => {
            charactersByLeague[league] = null;
          });
        }
        
        // Set characters for their respective leagues
        fetchedCharacters.forEach(character => {
          if (character.league) {
            charactersByLeague[character.league] = character;
          }
        });
        
        setLeagueCharacters(charactersByLeague);
      } else {
        console.error('Failed to fetch characters:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateButtonClick = (league: string) => {
    setSelectedLeague(league);
    setShowModal(true);
  };

  const handleCreateSuccess = () => {
    setShowModal(false);
    fetchCharacters();
  };

  // Format owner IDs to show only 3 digits at each end
  const formatOwnerId = (id: string) => {
    if (!id) return '';
    return `${id.substring(0, 3)}...${id.substring(id.length - 3)}`;
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
          <p>No characters yet. Create your first character in one of your available leagues!</p>
          
          {/* Display available leagues */}
          {user?.leagues && user.leagues.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {user.leagues.map(league => {
                const leagueInfo = getLeagueInfo(league);
                return (
                  <div 
                    key={league}
                    className="bg-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-xl mr-2">{leagueInfo.icon}</span>
                      <span className="font-medium">{leagueInfo.name}</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{leagueInfo.description}</p>
                    <button 
                      onClick={() => handleCreateButtonClick(league)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm"
                    >
                      Create Character in {leagueInfo.name}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-red-400">You don't have access to any leagues. Join the Discord server and get the necessary roles.</p>
          )}
        </div>
      ) : (
        <div>
          <h3 className="text-lg font-medium mb-3">Your League Characters</h3>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {user?.leagues && user.leagues.map(league => {
              const leagueInfo = getLeagueInfo(league);
              const character = leagueCharacters[league];
              
              return (
                <div 
                  key={league}
                  className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700"
                >
                  <div className="px-4 py-3 bg-gray-700 flex items-center">
                    <span className="text-xl mr-2">{leagueInfo.icon}</span>
                    <h4 className="font-medium">{leagueInfo.name}</h4>
                  </div>
                  
                  {character ? (
                    <Link href={`/character/${character.id}`}>
                      <div className="p-4 hover:bg-gray-700 transition cursor-pointer">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-lg">{character.name}</h3>
                            <p className="text-gray-400 truncate max-w-md">{character.traits}</p>
                            <div className="text-xs text-gray-500 mt-1">ID: {formatOwnerId(character.owner)}</div>
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
                  ) : (
                    <div className="p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-gray-400 mb-3">No character in this league yet</p>
                      <button 
                        onClick={() => handleCreateButtonClick(league)}
                        className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white text-sm"
                      >
                        Create Character
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <CreateCharacterModal
          onClose={() => setShowModal(false)}
          onSuccess={handleCreateSuccess}
          initialLeague={selectedLeague}
        />
      )}
    </div>
  );
}
