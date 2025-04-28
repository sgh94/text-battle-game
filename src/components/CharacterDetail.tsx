'use client';

import { useEffect, useState, useRef } from 'react';
import { BattleHistory } from './BattleHistory';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';

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
  const { user, isConnected } = useDiscordAuth();
  const [character, setCharacter] = useState<Character | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBattling, setIsBattling] = useState(false);
  const [battleResult, setBattleResult] = useState<any>(null);
  const [cooldown, setCooldown] = useState<number | null>(null);
  const [cooldownTimer, setCooldownTimer] = useState<NodeJS.Timeout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTraits, setIsEditingTraits] = useState(false);
  const [newTraits, setNewTraits] = useState('');
  const [traitUpdateCooldown, setTraitUpdateCooldown] = useState<number | null>(null);
  const [traitUpdateTimer, setTraitUpdateTimer] = useState<NodeJS.Timeout | null>(null);
  const [showTraitWarning, setShowTraitWarning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Add a function to format the cooldown time
  const formatCooldownTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Add a function to start the trait update cooldown timer
  const startTraitUpdateTimer = (seconds: number) => {
    if (traitUpdateTimer) clearInterval(traitUpdateTimer);

    setTraitUpdateCooldown(seconds);

    const timer = setInterval(() => {
      setTraitUpdateCooldown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    setTraitUpdateTimer(timer);
  };

  // Add a function to check trait update cooldown
  const checkTraitUpdateCooldown = async () => {
    try {
      const response = await fetch(`/api/character/${encodeURIComponent(id)}/update-traits`);

      if (response.ok) {
        const data = await response.json();

        if (data.remainingSeconds > 0) {
          setTraitUpdateCooldown(data.remainingSeconds);
          startTraitUpdateTimer(data.remainingSeconds);
        } else {
          setTraitUpdateCooldown(null);
        }
      }
    } catch (error) {
      console.error('Error checking trait update cooldown:', error);
    }
  };

  useEffect(() => {
    fetchCharacter();
    checkTraitUpdateCooldown();
    return () => {
      if (cooldownTimer) clearInterval(cooldownTimer);
      if (traitUpdateTimer) clearInterval(traitUpdateTimer);
    };
  }, [id]);

  const fetchCharacter = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/character/${encodeURIComponent(id)}`);

      if (!response.ok) {
        throw new Error('Failed to fetch character');
      }

      const data = await response.json();
      setCharacter(data.character);

      // Check if there's an active cooldown for this character
      checkCooldown();
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const checkCooldown = async () => {
    try {
      const response = await fetch(`/api/user/cooldown?characterId=${encodeURIComponent(id)}`);

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
    if (!user?.id || !character || isBattling) return;

    try {
      setIsBattling(true);
      setBattleResult(null);

      // Create Authorization header with the user ID as the token
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}:${Date.now()}:discord_auth_${user.id}`
        },
        body: JSON.stringify({ 
          characterId: id,
          userId: user.id 
        }),
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

  const deleteCharacter = async () => {
    if (!user?.id || !character || isDeleting) return;

    if (!confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/character/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}:${Date.now()}:discord_auth_${user.id}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete character');
      }

      // Redirect to the home page after successful deletion
      router.push('/');
    } catch (error: any) {
      console.error('Delete error:', error);
      alert(error.message || 'Failed to delete character');
      setIsDeleting(false);
    }
  };

  // Add this to handle editing mode
  const startEditingTraits = () => {
    if (character) {
      setNewTraits(character.traits);
      setIsEditingTraits(true);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // Add function to handle traits update
  const updateTraits = async () => {
    if (!user?.id || !character) return;

    try {
      // First close the warning modal
      setShowTraitWarning(false);
      
      const response = await fetch(`/api/character/${encodeURIComponent(id)}/update-traits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}:${Date.now()}:discord_auth_${user.id}`
        },
        body: JSON.stringify({ 
          traits: newTraits 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429 && data.remainingSeconds) {
          startTraitUpdateTimer(data.remainingSeconds);
        }
        throw new Error(data.error || 'Failed to update traits');
      }

      // Update character with new traits and ELO
      setCharacter(data.character);
      setIsEditingTraits(false);
      
      // Start cooldown
      startTraitUpdateTimer(6 * 60 * 60); // 6 hours
      
      // Show confirmation with ELO reduction
      alert(`Traits updated! Your ELO has been reduced from ${data.previousElo} to ${data.newElo} (${data.eloReduction} points penalty).`);
    } catch (error: any) {
      console.error('Trait update error:', error);
      alert(error.message || 'Failed to update traits');
    }
  };

  // Add this to handle the warning confirmation
  const confirmTraitUpdate = () => {
    setShowTraitWarning(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center my-8">
        <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

  // Check if current user is the owner by comparing Discord ID
  const isOwner = isConnected && user?.id === character.owner;

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
              {character.wins}W {character.losses}L {character.draws}D
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-gray-400 mb-2">Traits</h3>
          
          {isEditingTraits ? (
            <div>
              <textarea
                ref={textareaRef}
                value={newTraits}
                onChange={(e) => setNewTraits(e.target.value)}
                className="w-full h-40 p-2 bg-gray-700 text-white rounded-md mb-2"
                placeholder="Enter character traits..."
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditingTraits(false)}
                  className="py-2 px-4 rounded-md bg-gray-600 hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTraitUpdate}
                  className="py-2 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700"
                >
                  Update Traits
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="whitespace-pre-line mb-4">{character.traits}</p>
              {isOwner && (
                <button
                  onClick={startEditingTraits}
                  disabled={traitUpdateCooldown !== null}
                  className={`py-2 px-4 rounded-md text-sm ${
                    traitUpdateCooldown !== null
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {traitUpdateCooldown !== null ? (
                    `Cooldown: ${formatCooldownTime(traitUpdateCooldown)}`
                  ) : (
                    'Edit Traits'
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {isOwner && (
          <div className="mt-6 space-y-3">
            <button
              onClick={startBattle}
              disabled={isBattling || cooldown !== null}
              className={`w-full py-3 rounded-md font-bold text-center ${cooldown !== null
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'}`}
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

            <button
              onClick={deleteCharacter}
              disabled={isDeleting}
              className="w-full py-3 rounded-md font-bold text-center bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  삭제 중...
                </div>
              ) : (
                'Delete Character'
              )}
            </button>
          </div>
        )}

        {battleResult && (
          <div className="mt-6 bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-bold mb-2">Battle Result</h3>
            <p className="mb-4">
              {battleResult.isDraw
                ? 'Draw!'
                : battleResult.winner === character.id
                  ? 'Victory!'
                  : 'Defeat!'}
            </p>
            <p className="text-gray-300">{battleResult.narrative || battleResult.explanation}</p>
          </div>
        )}
      </div>

      {showTraitWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-red-400">Warning: ELO Penalty</h3>
            <p className="mb-4">
              Updating your character's traits will result in a <span className="font-bold text-red-400">25% ELO reduction</span>.
              Your current ELO is {character.elo}, which means you will lose {Math.round(character.elo * 0.25)} points.
            </p>
            <p className="mb-6">
              Additionally, you won't be able to update traits again for <span className="font-bold">6 hours</span>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowTraitWarning(false)}
                className="py-2 px-4 rounded-md bg-gray-600 hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={updateTraits}
                className="py-2 px-4 rounded-md bg-red-600 hover:bg-red-700"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      <BattleHistory characterId={id} />
    </div>
  );
}
