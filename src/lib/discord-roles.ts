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

// 사용자의 역할에 따라 접근 가능한 리그 목록 결정
export function determineUserLeagues(roles: string[]): string[] {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return ['general']; // 기본 리그는 General League
  }
  
  const leagues = new Set<string>();
  
  // General League는 기본적으로 모든 사용자에게 부여
  leagues.add('general');
  
  // 역할 기반 리그 할당
  roles.forEach(roleId => {
    if (roleId === '1366310139425980436') { // Veteran Mitosis Explorers
      leagues.add('veteran');
    }
    if (roleId === '1366310183281885234') { // Community Guardians
      leagues.add('community');
    }
    if (roleId === '1366310235605696512') { // Morse Trainer
      leagues.add('morse');
    }
  });
  
  return Array.from(leagues);
}

// 사용자의 주요 리그 결정 (기본값)
export function getPrimaryLeague(leagues: string[]): string {
  // 사용자가 접근 가능한 리그가 하나만 있는 경우, 그것이 주 리그
  if (leagues.length === 1) {
    return leagues[0];
  }
  
  // 사용자가 접근 가능한 리그가 여러 개인 경우, 가장 첫 번째 비 general 리그를 반환
  for (const league of leagues) {
    if (league !== 'general') {
      return league;
    }
  }
  
  return 'general'; // 기본 리그
}

// 리그 정보 조회
export function getLeagueInfo(leagueId: string) {
  return LEAGUES[leagueId as keyof typeof LEAGUES] || {
    id: leagueId,
    name: leagueId.charAt(0).toUpperCase() + leagueId.slice(1) + ' League',
    color: '#888888',
    icon: '🏆',
    description: 'A league for battlers',
    eligibility: 'Open to all',
    order: 0
  };
}

// 해당 리그 접근 권한이 있는지 확인
export function hasLeagueAccess(leagues: string[], leagueId: string): boolean {
  return leagues.includes(leagueId);
}

// 사용자 역할 설명 생성 (사용자 경험 개선용)
export function generateRoleDescription(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return '역할 없음 (기본 General League에 속합니다)';
  }
  
  const leagues = determineUserLeagues(roles);
  const primaryLeague = getPrimaryLeague(leagues);
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
