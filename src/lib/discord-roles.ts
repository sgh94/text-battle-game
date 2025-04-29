// Discord role and league management logic

// Role ID to league mapping
export const ROLE_TO_LEAGUE_MAP: Record<string, string> = {
  // Mapping of actual Discord server role IDs to their corresponding leagues
  '1366310085462200362': 'general',        // General League
  '1366310139425980436': 'veteran',        // Veteran Mitosis Explorers
  '1366310183281885234': 'community',      // Community Guardians
  '1366310235605696512': 'morse'           // Morse Trainer
};

// All League information 
export const LEAGUES = {
  general: {
    id: 'general',
    name: 'General League',
    color: '#6a7ec7',
    icon: '1️⃣',
    description: 'For every Mitosian brave enough to enter the arena.',
    eligibility: 'THB League 1 role in Mitosis Discord',
    order: 1
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran Mitosis Explorers',
    color: '#c7c7c7',
    icon: '2️⃣',
    description: 'You\'ve touched the Vaults. You\'ve earned your place.',
    eligibility: 'THB League 2 role in Mitosis Discord',
    order: 2
  },
  community: {
    id: 'community',
    name: 'Community Guardians',
    color: '#e5c07b',
    icon: '3️⃣',
    description: 'The ones who built the culture together.',
    eligibility: 'THB League 3 role in Mitosis Discord',
    order: 3
  },
  morse: {
    id: 'morse',
    name: 'Morse Trainer',
    color: '#e06c75',
    icon: '4️⃣',
    description: 'You train Morse well. But can you train your hero for battle?',
    eligibility: 'THB League 4 role in Mitosis Discord',
    order: 4
  }
};

// Map roles to league IDs directly with exact role IDs
export const ROLE_REQUIREMENTS = {
  'general': ['1366310085462200362'],
  'veteran': ['1366310139425980436'],
  'community': ['1366310183281885234'],
  'morse': ['1366310235605696512']
};

// Determine accessible leagues based on user roles
export function determineUserLeagues(roles: string[]): string[] {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return []; // No default league - all leagues require specific roles
  }

  const leagues = new Set<string>();

  // Check if the user has the required roles for each league
  Object.entries(ROLE_REQUIREMENTS).forEach(([leagueId, requiredRoles]) => {
    // User can access the league if they have at least one of the required roles
    const hasRequiredRole = requiredRoles.some(roleId => roles.includes(roleId));
    if (hasRequiredRole) {
      leagues.add(leagueId);
    }
  });

  return Array.from(leagues);
}

// Determine the user's primary league (default)
export function getPrimaryLeague(leagues: string[]): string | null {
  // If the user has no accessible leagues
  if (!leagues || leagues.length === 0) {
    return null;
  }

  // If the user has access to only one league, that's their primary league
  if (leagues.length === 1) {
    return leagues[0];
  }

  // If the user has access to multiple leagues, return based on priority order
  const leaguePriority = ['morse', 'community', 'veteran', 'general'];
  for (const league of leaguePriority) {
    if (leagues.includes(league)) {
      return league;
    }
  }

  // If no match is found, return the first league
  return leagues[0];
}

// Get league information
export function getLeagueInfo(leagueId: string) {
  return LEAGUES[leagueId as keyof typeof LEAGUES] || {
    id: leagueId,
    name: leagueId.charAt(0).toUpperCase() + leagueId.slice(1) + ' League',
    color: '#888888',
    icon: '🏆',
    description: 'A league for battlers',
    eligibility: 'Requires specific Discord role',
    order: 0
  };
}

// Check if the user has access to a specific league
export function hasLeagueAccess(userRoles: string[], leagueId: string): boolean {
  if (!ROLE_REQUIREMENTS[leagueId as keyof typeof ROLE_REQUIREMENTS]) {
    return false;
  }

  const requiredRoles = ROLE_REQUIREMENTS[leagueId as keyof typeof ROLE_REQUIREMENTS];
  return requiredRoles.some(roleId => userRoles.includes(roleId));
}

// Get role name from role ID (helper function for development)
export function getRoleNameFromId(roleId: string): string {
  const leagueId = ROLE_TO_LEAGUE_MAP[roleId];
  if (leagueId) {
    const league = LEAGUES[leagueId as keyof typeof LEAGUES];
    return league ? `${league.name} role` : 'Unknown role';
  }

  return 'General role';
}

// Generate user role description (for improved user experience)
export function generateRoleDescription(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return 'No roles (no league access permissions)';
  }

  const leagues = determineUserLeagues(roles);
  if (leagues.length === 0) {
    return 'No accessible leagues';
  }

  const primaryLeague = getPrimaryLeague(leagues);
  if (!primaryLeague) {
    return 'No accessible leagues';
  }

  const primaryLeagueInfo = getLeagueInfo(primaryLeague);

  let description = `Primary league: ${primaryLeagueInfo.name} (${primaryLeagueInfo.icon})`;

  if (leagues.length > 1) {
    const otherLeagues = leagues
      .filter(league => league !== primaryLeague)
      .map(league => getLeagueInfo(league).name)
      .join(', ');

    description += `\nAdditional accessible leagues: ${otherLeagues}`;
  }

  return description;
}
