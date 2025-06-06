"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDiscordAuth } from "@/hooks/useDiscordAuth";
import { getLeagueInfo } from "@/lib/discord-roles";

interface Character {
  id: string;
  name: string;
  owner: string;
  elo: number;
  rank: number;
  wins: number;
  losses: number;
  draws: number;
  league: string;
}

interface UserRanking {
  characterId: string;
  characterName: string;
  rank: number;
  elo: number;
}

interface RankingResponse {
  rankings: Character[];
  total: number;
  showing: number;
}

export function RankingList() {
  const { user } = useDiscordAuth();
  const [rankings, setRankings] = useState<Character[]>([]);
  const [userRanking, setUserRanking] = useState<UserRanking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState("general");
  const [allLeagues, setAllLeagues] = useState<string[]>([
    "general",
    "veteran",
    "community",
    "morse",
  ]);
  const [totalCount, setTotalCount] = useState(0);
  const [showingCount, setShowingCount] = useState(0);

  // Debugging state
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    // Set user's available leagues if they're logged in
    if (user?.leagues && user.leagues.length > 0) {
      // Default to the user's primary league if they have one
      if (user.primaryLeague) {
        setSelectedLeague(user.primaryLeague);
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedLeague) {
      fetchRankings(selectedLeague);
    }
  }, [selectedLeague]);

  const fetchRankings = async (leagueId: string) => {
    try {
      setIsLoading(true);
      setFetchError(null);
      setDebugInfo(null);
      const userId = user?.id;

      console.log(`Fetching rankings for league: ${leagueId}`);

      // Fetch rankings for the selected league with a cache-busting parameter
      const timestamp = Date.now();
      const response = await fetch(
        `/api/ranking?league=${leagueId}&limit=10&t=${timestamp}`
      );

      if (response.ok) {
        const data: RankingResponse = await response.json();
        console.log(`Rankings for ${leagueId}:`, data);

        // Set rankings directly - server already filters by league correctly
        setRankings(data.rankings || []);
        setTotalCount(data.total || 0);
        setShowingCount(data.showing || data.rankings?.length || 0);

        // If user is logged in, fetch their ranking
        if (userId) {
          try {
            console.log(
              `Fetching user ranking for userId: ${userId}, league: ${leagueId}`
            );
            console.log("Full user object:", user);
            const userRankingResponse = await fetch(
              `/api/ranking/user?userId=${userId}&league=${leagueId}&t=${timestamp}`
            );
            if (userRankingResponse.ok) {
              const userRankingData = await userRankingResponse.json();
              console.log(
                `User ranking response for ${leagueId}:`,
                userRankingData
              );
              if (userRankingData.ranking) {
                console.log(
                  `User ranking for ${leagueId}:`,
                  userRankingData.ranking
                );
                console.log(
                  `User rank: ${userRankingData.ranking.rank}, Character: ${userRankingData.ranking.characterName}`
                );
                setUserRanking(userRankingData.ranking);
              } else {
                console.log(`No user ranking found for ${leagueId}`);
                setUserRanking(null);
              }
            } else {
              console.error(
                `Failed to fetch user ranking:`,
                await userRankingResponse.text().catch(() => "Unknown error")
              );
              setUserRanking(null);
            }
          } catch (userRankingError) {
            console.error("Error fetching user ranking:", userRankingError);
            setUserRanking(null);
          }
        } else {
          console.log("No user logged in, skipping user ranking fetch");
          setUserRanking(null);
        }
      } else {
        console.error(
          "Failed to fetch rankings:",
          await response.text().catch(() => "Unknown error")
        );
        setFetchError(`Failed to fetch rankings for league: ${leagueId}`);
        setRankings([]);
        setTotalCount(0);
        setShowingCount(0);
      }
    } catch (error) {
      console.error("Error fetching rankings:", error);
      setFetchError(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setRankings([]);
      setTotalCount(0);
      setShowingCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Format owner address to show only 3 digits at each end
  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 3)}...${addr.substring(addr.length - 3)}`;
  };

  // Check if user ranking is already in top 10
  const isUserInTopRankings = () => {
    if (!userRanking) {
      console.log("No user ranking to check");
      return false;
    }
    const isInTop = rankings.some(
      (char) => char.id === userRanking.characterId
    );
    console.log(
      `User ranking check: characterId=${userRanking.characterId}, isInTopRankings=${isInTop}`
    );
    console.log(
      "Current top rankings character IDs:",
      rankings.map((r) => r.id)
    );
    return isInTop;
  };

  // Get league name and icon for display
  const getLeagueDisplay = (leagueId: string) => {
    const info = getLeagueInfo(leagueId);
    return (
      <>
        <span className="mr-1">{info.icon}</span>
        {info.name}
      </>
    );
  };

  return (
    <div className="mt-4">
      <h2 className="text-xl font-bold mb-6">Leaderboard</h2>

      {/* League selector - larger, more prominent tabs */}
      <div className="mb-6">
        <div className="grid grid-cols-4 gap-1 bg-gray-900 rounded-lg p-1">
          {allLeagues.map((league) => {
            const leagueInfo = getLeagueInfo(league);
            const isActive = selectedLeague === league;

            return (
              <button
                key={league}
                onClick={() => setSelectedLeague(league)}
                className={`py-3 px-2 rounded-md transition flex flex-col items-center justify-center text-center ${
                  isActive
                    ? "bg-gray-700 font-bold shadow-md"
                    : "bg-gray-800 hover:bg-gray-750"
                }`}
                style={
                  isActive ? { backgroundColor: `${leagueInfo.color}30` } : {}
                }
              >
                <span className="text-xl mb-1">{leagueInfo.icon}</span>
                <span className="text-sm whitespace-nowrap">
                  {leagueInfo.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-4">
          <p className="font-medium">Error Occurred</p>
          <p className="text-sm">{fetchError}</p>
        </div>
      )}

      {/* Debug info for development only */}
      {process.env.NODE_ENV === "development" && (
        <div className="mb-4 bg-blue-900/30 border border-blue-700 text-blue-200 px-4 py-3 rounded-md">
          <p className="text-sm">Debug Info:</p>
          <p className="text-xs">User ID: {user?.id || "Not logged in"}</p>
          <p className="text-xs">User Connected: {user ? "Yes" : "No"}</p>
          <p className="text-xs">Selected League: {selectedLeague}</p>
          <p className="text-xs">
            User Ranking:{" "}
            {userRanking
              ? `#${userRanking.rank} (${userRanking.characterName})`
              : "None"}
          </p>
          <p className="text-xs">
            Is User in Top Rankings: {isUserInTopRankings() ? "Yes" : "No"}
          </p>
          <p className="text-xs">Rankings Count: {rankings.length}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center my-8">
          <svg
            className="animate-spin h-8 w-8 text-purple-500"
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
      ) : rankings.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center">
          <p>No rankings available for {getLeagueInfo(selectedLeague).name}</p>
          {user && user.leagues && user.leagues.includes(selectedLeague) && (
            <p className="mt-2 text-gray-400">
              Summon a hero in this league to be the first on the leaderboard!
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Current selected league indicator */}
          <div className="bg-gray-800 p-3 rounded-t-lg flex items-center border-b border-gray-700">
            <span className="text-xl mr-2">
              {getLeagueInfo(selectedLeague).icon}
            </span>
            <span className="font-bold">
              {getLeagueInfo(selectedLeague).name}
            </span>
          </div>

          <div className="bg-gray-800 rounded-b-lg overflow-hidden max-h-[500px] overflow-y-auto scrollbar-thin">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left">#</th>
                    <th className="px-4 py-2 text-left">Hero</th>
                    <th className="px-4 py-2 text-left">Summoner</th>
                    <th className="px-4 py-2 text-right">Fame Points</th>
                    <th className="px-4 py-2 text-right">W/L/D</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((character, index) => (
                    <tr
                      key={character.id}
                      className={`border-t border-gray-700 hover:bg-gray-700 transition ${
                        userRanking?.characterId === character.id
                          ? "bg-purple-900 bg-opacity-30"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">{index + 1}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/character/${character.id}`}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {character.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatAddress(character.owner)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold">
                        {character.elo}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <span className="text-green-500">
                          {character.wins || 0}
                        </span>
                        /
                        <span className="text-red-500">
                          {character.losses || 0}
                        </span>
                        /
                        <span className="text-gray-400">
                          {character.draws || 0}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Show user's ranking - always show if exists */}
                  {userRanking && (
                    <>
                      {!isUserInTopRankings() && (
                        <tr className="border-t border-gray-600">
                          <td
                            colSpan={5}
                            className="px-4 py-2 text-center text-xs text-gray-500"
                          >
                            • • •
                          </td>
                        </tr>
                      )}
                      {!isUserInTopRankings() && (
                        <tr className="border-t border-gray-700 bg-purple-900 bg-opacity-30">
                          <td className="px-4 py-3">{userRanking.rank}</td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/character/${userRanking.characterId}`}
                              className="text-purple-400 hover:text-purple-300"
                            >
                              {userRanking.characterName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-400">
                            {user ? formatAddress(user.id) : ""}
                          </td>
                          <td className="px-4 py-3 text-right font-bold">
                            {userRanking.elo}
                          </td>
                          <td className="px-4 py-3"></td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="mt-4 bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-medium mb-2">
          {getLeagueInfo(selectedLeague).icon}{" "}
          {getLeagueInfo(selectedLeague).name}
        </h3>
        <p className="text-gray-400 text-sm">
          {getLeagueInfo(selectedLeague).description}
        </p>
        <p className="text-gray-500 text-xs mt-2">
          <span className="font-medium">Eligibility:</span>{" "}
          {getLeagueInfo(selectedLeague).eligibility}
        </p>
      </div>

      {/* Debug button only shown in development mode */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-2 text-right">
          <button
            onClick={() => fetchRankings(selectedLeague)}
            className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded-md"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
