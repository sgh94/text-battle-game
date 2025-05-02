'use client';

import { useState, useEffect } from 'react';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { getLeagueInfo } from '@/lib/discord-roles';

// Constants for input limits
const NAME_MAX_LENGTH = 200;
const TRAITS_MAX_LENGTH = 500;

interface CreateCharacterModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialLeague?: string | null;
}

export function CreateCharacterModal({
  onClose,
  onSuccess,
  initialLeague = null
}: CreateCharacterModalProps) {
  const { user } = useDiscordAuth();
  const [name, setName] = useState('');
  const [traits, setTraits] = useState('');
  const [selectedLeague, setSelectedLeague] = useState<string | null>(initialLeague);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [availableLeagues, setAvailableLeagues] = useState<string[]>([]);

  // Also track which leagues the user already has characters in
  const [leaguesWithCharacters, setLeaguesWithCharacters] = useState<string[]>([]);

  // Set default selected league when user data is loaded
  useEffect(() => {
    if (user?.leagues && user.leagues.length > 0) {
      setAvailableLeagues(user.leagues);

      // If no initial league is provided, select first available
      if (!selectedLeague && user.leagues.length > 0) {
        setSelectedLeague(user.leagues[0]);
      }

      // Check which leagues already have characters
      checkExistingCharacters();
    }
  }, [user, selectedLeague, initialLeague]);

  // Check for existing characters in each league
  const checkExistingCharacters = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/character?address=${user.id}`);

      if (response.ok) {
        const data = await response.json();
        const characters = data.characters || [];

        // Get the leagues that already have characters
        const leagues = characters.map((char: any) => char.league).filter(Boolean);
        setLeaguesWithCharacters(leagues);

        // If the initially selected league already has a character, show error
        if (selectedLeague && leagues.includes(selectedLeague)) {
          setError(`You already have a hero in the ${getLeagueInfo(selectedLeague).name} league.`);
        } else {
          setError('');
        }
      }
    } catch (error) {
      console.error('Error checking existing characters:', error);
    }
  };

  // Handle name input with length limit
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= NAME_MAX_LENGTH) {
      setName(value);
    }
  };

  // Handle traits input with length limit
  const handleTraitsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= TRAITS_MAX_LENGTH) {
      setTraits(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !traits.trim()) {
      setError('Name and traits are required');
      return;
    }

    if (!selectedLeague) {
      setError('Please select a league');
      return;
    }

    // Check if user already has a character in this league
    if (leaguesWithCharacters.includes(selectedLeague)) {
      setError(`You already have a hero in the ${getLeagueInfo(selectedLeague).name} league. Only one hero per league is allowed.`);
      return;
    }

    // Check if user ID is available
    if (!user?.id) {
      setError('No user ID found. Please reconnect your Discord account.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      // Check for valid auth token
      const accessToken = localStorage.getItem('discord_access_token');
      if (!accessToken) {
        throw new Error('You are not authenticated. Please log in again.');
      }

      // Create Authorization header with the user ID as the token
      const response = await fetch('/api/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}:${Date.now()}:discord_auth_${user.id}`,
        },
        body: JSON.stringify({
          name,
          traits,
          userId: user.id,
          discordUsername: user.username,
          league: selectedLeague
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create hero');
      }

      console.log('Hero created successfully:', data);
      onSuccess();
    } catch (error: any) {
      console.error('Error creating hero:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter available leagues to only show those without characters
  const getAvailableLeaguesWithoutCharacters = () => {
    return availableLeagues.filter(league => !leaguesWithCharacters.includes(league));
  };

  const noAvailableLeagues = getAvailableLeaguesWithoutCharacters().length === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Customize Your Hero</h2>

        {availableLeagues.length === 0 ? (
          <div className="bg-red-900/30 border border-red-500 p-4 rounded-lg mb-4">
            <p className="mb-2 font-bold">No League Access</p>
            <p>You don't have any Discord roles that grant league access.</p>
            <p className="mt-2 text-sm">Join the Discord server and get the necessary roles to participate in leagues.</p>
          </div>
        ) : noAvailableLeagues ? (
          <div className="bg-yellow-900/30 border border-yellow-500 p-4 rounded-lg mb-4">
            <p className="mb-2 font-bold">All Leagues Filled</p>
            <p>You already have heroes in all available leagues.</p>
            <p className="mt-2 text-sm">Each player can have only one hero per league.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Hero Name <span className="text-gray-400 text-xs">({name.length}/{NAME_MAX_LENGTH})</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={handleNameChange}
                maxLength={NAME_MAX_LENGTH}
                className="w-full bg-gray-700 rounded-md border border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter hero name"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="traits" className="block text-sm font-medium mb-1">
                Hero Descriptions <span className="text-gray-400 text-xs">({traits.length}/{TRAITS_MAX_LENGTH})</span>
              </label>
              <textarea
                id="traits"
                value={traits}
                onChange={handleTraitsChange}
                maxLength={TRAITS_MAX_LENGTH}
                rows={4}
                className="w-full bg-gray-700 rounded-md border border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe traits, abilities, and personality of your hero"
              />
              {traits.length >= TRAITS_MAX_LENGTH * 0.9 && (
                <p className="text-yellow-500 text-xs mt-1">
                  You're approaching the maximum character limit.
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Choose a League
              </label>
              <div className="grid grid-cols-1 gap-3">
                {getAvailableLeaguesWithoutCharacters().map(league => {
                  const leagueInfo = getLeagueInfo(league);
                  return (
                    <button
                      key={league}
                      type="button"
                      onClick={() => setSelectedLeague(league)}
                      className={`text-left px-4 py-3 rounded transition-colors border ${selectedLeague === league
                          ? 'bg-gray-700 border-indigo-500'
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex items-center">
                        <span className="mr-2 text-xl">{leagueInfo.icon}</span>
                        <div>
                          <div className="font-medium">{leagueInfo.name}</div>
                          <div className="text-sm text-gray-400">{leagueInfo.description}</div>
                          <div className="text-xs mt-1 text-gray-500">
                            <span className="font-medium">Eligibility:</span> {leagueInfo.eligibility}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="mb-4 text-red-500 text-sm">{error}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedLeague || noAvailableLeagues}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-2 disabled:bg-indigo-800 disabled:opacity-70"
              >
                {isSubmitting && (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                Summon
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}