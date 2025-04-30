'use client';

import { useState, useEffect } from 'react';
import { useDiscordAuth } from '@/hooks/useDiscordAuth';
import { getLeagueInfo, ROLE_REQUIREMENTS } from '@/lib/discord-roles';
import Link from 'next/link';

export function LeagueSelector() {
  const { user } = useDiscordAuth();
  const [expandedLeague, setExpandedLeague] = useState<string | null>(null);
  const [allLeagues, setAllLeagues] = useState<string[]>(['general', 'veteran', 'community', 'morse']);

  // Show all available leagues, even if user doesn't have access to them
  const leagues = allLeagues;

  const toggleExpand = (leagueId: string) => {
    if (expandedLeague === leagueId) {
      setExpandedLeague(null);
    } else {
      setExpandedLeague(leagueId);
    }
  };

  // Check if user has access to a league
  const hasLeagueAccess = (leagueId: string) => {
    if (!user || !user.roles) return false;

    // Get the required roles for this league
    const requiredRoles = ROLE_REQUIREMENTS[leagueId as keyof typeof ROLE_REQUIREMENTS];
    if (!requiredRoles) return false;

    // Check if user has at least one of the required roles
    return requiredRoles.some(roleId => user.roles.includes(roleId));
  };

  return (
    <div className="my-8">
      <h2 className="text-xl font-bold mb-4">League Types</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leagues.map(leagueId => {
          const leagueInfo = getLeagueInfo(leagueId);
          const isExpanded = expandedLeague === leagueId;
          const userHasAccess = user ? hasLeagueAccess(leagueId) : false;

          return (
            <div
              key={leagueId}
              className={`bg-gray-800 rounded-lg overflow-hidden border ${userHasAccess
                ? 'border-gray-600 hover:border-gray-500'
                : 'border-gray-700'
                } transition`}
            >
              <div
                className="p-4 cursor-pointer flex justify-between items-center"
                onClick={() => toggleExpand(leagueId)}
              >
                <div className="flex items-center">
                  <span className="text-xl mr-3">{leagueInfo.icon}</span>
                  <div>
                    <h3 className="font-medium">{leagueInfo.name}</h3>
                    <p className="text-sm text-gray-400 line-clamp-1">{leagueInfo.description}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  {!userHasAccess && (
                    <span className="mr-2 px-2 py-1 text-xs bg-red-900/50 text-red-300 rounded-md border border-red-800">Role Required</span>
                  )}
                  <svg
                    className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-700">
                  <p className="text-gray-300 mb-3">{leagueInfo.description}</p>
                  <div className="mb-3 bg-gray-700/50 p-3 rounded-md border-l-2 border-yellow-500">
                    <h4 className="text-sm font-medium mb-1 text-gray-300">Required Discord Role:</h4>
                    <p className="text-sm">{leagueInfo.eligibility}</p>
                  </div>

                  <div className="flex flex-col gap-2 mt-4">
                    <Link
                      href={`/ranking?league=${leagueId}`}
                      className="text-sm text-center py-2 bg-gray-700 hover:bg-gray-600 rounded-md"
                    >
                      View Leaderboard
                    </Link>

                    {userHasAccess ? (
                      <Link
                        href={`/battle?league=${leagueId}`}
                        className="text-sm text-center py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md"
                      >
                        Battle in {leagueInfo.name}
                      </Link>
                    ) : (
                      <div className="relative">
                        <div className="text-sm text-center py-2 bg-gray-700 text-gray-500 rounded-md cursor-not-allowed">
                          Need Discord Role Access to Battle
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
