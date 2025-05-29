"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Battle {
  id: string;
  character1: string;
  character2: string;
  winner: string;
  isDraw: boolean;
  explanation: string;
  narrative: string;
  timestamp: number | string; // timestamp can be number or string
}

interface Character {
  id: string;
  name: string;
}

interface BattleHistoryProps {
  characterId: string;
}

export function BattleHistory({ characterId }: BattleHistoryProps) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [characters, setCharacters] = useState<Record<string, Character>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBattleHistory();
  }, [characterId]);

  const fetchBattleHistory = async () => {
    try {
      setIsLoading(true);
      // Use encodeURIComponent to handle special characters in the ID
      const response = await fetch(
        `/api/battle?characterId=${encodeURIComponent(characterId)}`
      );

      if (response.ok) {
        const data = await response.json();
        setBattles(data.battles || []);

        // Fetch character data for all battles
        await fetchCharactersInfo(data.battles);
      }
    } catch (error) {
      console.error("Error fetching battle history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCharactersInfo = async (battles: Battle[]) => {
    const characterIds = new Set<string>();

    // Collect all unique character IDs from battles
    battles.forEach((battle) => {
      characterIds.add(battle.character1);
      characterIds.add(battle.character2);
    });

    // Create a map of character IDs to character data
    const charactersMap: Record<string, Character> = {};

    // Fetch character data for each unique ID
    await Promise.all(
      Array.from(characterIds).map(async (id) => {
        try {
          // Use encodeURIComponent to handle special characters in the ID
          const response = await fetch(
            `/api/character/${encodeURIComponent(id)}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.character) {
              charactersMap[id] = {
                id: data.character.id,
                name: data.character.name,
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching character ${id}:`, error);
        }
      })
    );

    setCharacters(charactersMap);
  };

  const formatDate = (timestamp: number | string) => {
    if (!timestamp || timestamp === 0 || timestamp === "0") {
      return "Unknown Date";
    }

    try {
      // Convert string timestamp to number if needed
      const numTimestamp =
        typeof timestamp === "string" ? parseInt(timestamp) : timestamp;

      if (isNaN(numTimestamp)) {
        return "Invalid Date";
      }

      const date = new Date(numTimestamp);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }); // 간결한 영어 형식
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center my-4">
        <svg
          className="animate-spin h-5 w-5 text-indigo-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Battle History</h2>
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">No battles yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-screen overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Battle History</h2>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {battles.map((battle) => {
          const isCharacter1 = battle.character1 === characterId;
          const opponentId = isCharacter1
            ? battle.character2
            : battle.character1;
          const opponent = characters[opponentId];

          let resultClass = "";
          let resultText = "";

          if (battle.isDraw) {
            resultClass = "bg-gray-700";
            resultText = "Draw";
          } else if (battle.winner === characterId) {
            resultClass = "bg-green-900";
            resultText = "Victory";
          } else {
            resultClass = "bg-red-900";
            resultText = "Defeat";
          }

          return (
            <div
              key={battle.id}
              className={`rounded-lg overflow-hidden ${resultClass}`}
            >
              <div className="p-4">
                <div className="flex justify-between mb-2">
                  <div>
                    <span className="font-bold">{resultText}</span>
                    <span className="mx-2">•</span>
                    <span className="text-sm text-gray-300">
                      {battle.timestamp
                        ? formatDate(battle.timestamp)
                        : "Invalid Date"}
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-center gap-4 my-2">
                    <div className="text-center">
                      <div className="font-bold">
                        {characters[characterId]?.name || characterId}
                      </div>
                      <div className="text-sm text-gray-400">
                        {isCharacter1 ? "(You)" : ""}
                      </div>
                    </div>

                    <div className="text-lg font-bold">VS</div>

                    <div className="text-center">
                      <div className="font-bold">
                        {opponent ? (
                          <Link
                            href={`/character/${encodeURIComponent(
                              opponentId
                            )}`}
                            className="text-blue-400 hover:underline"
                          >
                            {opponent.name}
                          </Link>
                        ) : (
                          opponentId
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-300 whitespace-pre-line">
                  {battle.narrative || battle.explanation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
