// Discord 역할 및 리그 관리 로직

// 역할 ID와 리그 매핑
export const ROLE_TO_LEAGUE_MAP: Record<string, string> = {
  // 실제 디스코드 서버의 역할 ID와 해당 리그를 매핑
  '1366310085462200362': 'general',        // General League
  '1366310139425980436': 'veteran',        // Veteran Mitosis Explorers
  '1366310183281885234': 'community',      // Community Guardians
  '1366310235605696512': 'morse'           // Morse Trainer
};

// 리그 정보 
export const LEAGUES = {
  general: {
    id: 'general',
    name: 'General League',
    color: '#6a7ec7',
    icon: '1️⃣',
    description: 'For every Mitosian brave enough to enter the arena.',
    eligibility: 'Have the Mitosian role in Mitosis Discord',
    order: 1
  },
  veteran: {
    id: 'veteran',
    name: 'Veteran Mitosis Explorers',
    color: '#c7c7c7',
    icon: '2️⃣',
    description: 'You\'ve touched the Vaults. You\'ve earned your place.',
    eligibility: 'Have the Expedition Explorer role in Mitosis Discord',
    order: 2
  },
  community: {
    id: 'community',
    name: 'Community Guardians',
    color: '#e5c07b',
    icon: '3️⃣',
    description: 'The ones who built the culture together.',
    eligibility: 'Have at least one of the community roles in Mitosis Discord',
    order: 3
  },
  morse: {
    id: 'morse',
    name: 'Morse Trainer',
    color: '#e06c75',
    icon: '4️⃣',
    description: 'You train Morse well. But can you train your hero for battle?',
    eligibility: 'Have the Morse Trainer role in Mitosis Discord',
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

// 사용자의 역할에 따라 접근 가능한 리그 목록 결정
export function determineUserLeagues(roles: string[]): string[] {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return []; // 기본 리그 없음 - 모든 리그는 특정 역할이 필요함
  }
  
  const leagues = new Set<string>();
  
  // 각 리그별로 필요한 역할을 가지고 있는지 확인
  Object.entries(ROLE_REQUIREMENTS).forEach(([leagueId, requiredRoles]) => {
    // 필요한 역할 중 하나라도 가지고 있으면 해당 리그에 접근 가능
    const hasRequiredRole = requiredRoles.some(roleId => roles.includes(roleId));
    if (hasRequiredRole) {
      leagues.add(leagueId);
    }
  });
  
  return Array.from(leagues);
}

// 사용자의 주요 리그 결정 (기본값)
export function getPrimaryLeague(leagues: string[]): string | null {
  // 사용자가 접근 가능한 리그가 없는 경우
  if (!leagues || leagues.length === 0) {
    return null;
  }
  
  // 사용자가 접근 가능한 리그가 하나만 있는 경우, 그것이 주 리그
  if (leagues.length === 1) {
    return leagues[0];
  }
  
  // 여러 리그에 접근 가능한 경우, 우선순위 높은 순서대로 반환
  const leaguePriority = ['morse', 'community', 'veteran', 'general'];
  for (const league of leaguePriority) {
    if (leagues.includes(league)) {
      return league;
    }
  }
  
  // 매치되는 것이 없으면 첫 번째 리그 반환
  return leagues[0];
}

// 리그 정보 조회
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

// 해당 리그 접근 권한이 있는지 확인
export function hasLeagueAccess(userRoles: string[], leagueId: string): boolean {
  if (!ROLE_REQUIREMENTS[leagueId as keyof typeof ROLE_REQUIREMENTS]) {
    return false;
  }
  
  const requiredRoles = ROLE_REQUIREMENTS[leagueId as keyof typeof ROLE_REQUIREMENTS];
  return requiredRoles.some(roleId => userRoles.includes(roleId));
}

// 역할 ID로부터 역할 이름 조회 (개발용 헬퍼 함수)
export function getRoleNameFromId(roleId: string): string {
  const leagueId = ROLE_TO_LEAGUE_MAP[roleId];
  if (leagueId) {
    const league = LEAGUES[leagueId as keyof typeof LEAGUES];
    return league ? `${league.name} 역할` : '알 수 없는 역할';
  }
  
  return '일반 역할';
}

// 사용자 역할 설명 생성 (사용자 경험 개선용)
export function generateRoleDescription(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return '역할 없음 (리그 접근 권한이 없습니다)';
  }
  
  const leagues = determineUserLeagues(roles);
  if (leagues.length === 0) {
    return '접근 가능한 리그가 없습니다';
  }
  
  const primaryLeague = getPrimaryLeague(leagues);
  if (!primaryLeague) {
    return '접근 가능한 리그가 없습니다';
  }
  
  const primaryLeagueInfo = getLeagueInfo(primaryLeague);
  
  let description = `주 선택 리그: ${primaryLeagueInfo.name} (${primaryLeagueInfo.icon})`;
  
  if (leagues.length > 1) {
    const otherLeagues = leagues
      .filter(league => league !== primaryLeague)
      .map(league => getLeagueInfo(league).name)
      .join(', ');
    
    description += `\n접근 가능한 추가 리그: ${otherLeagues}`;
  }
  
  return description;
}
