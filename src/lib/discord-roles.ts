// Discord 역할 및 리그 관리 로직

// 역할 ID와 리그 매핑
export const ROLE_TO_LEAGUE_MAP: Record<string, string> = {
  // 여기에 실제 디스코드 서버의 역할 ID와 해당 리그를 매핑합니다
  // 예시 역할 ID - 실제 구현 시 업데이트 필요
  '123456789123456789': 'bronze',
  '234567890234567890': 'silver',
  '345678901345678901': 'gold',
  '456789012456789012': 'platinum',
};

// 특별 역할 - 여러 리그에 접근 권한을 부여하는 역할
export const SPECIAL_ROLES: Record<string, string[]> = {
  '567890123567890123': ['gold', 'platinum'],
  '678901234678901234': ['silver', 'gold'],
};

// 리그 정보 
export const LEAGUES = {
  bronze: {
    id: 'bronze',
    name: '브론즈 리그',
    color: '#cd7f32',
    icon: '🥉',
    description: '모든 플레이어를 위한 시작 리그',
    minRating: 0,
    order: 1
  },
  silver: {
    id: 'silver',
    name: '실버 리그',
    color: '#c0c0c0',
    icon: '🥈',
    description: '일정 수준의 실력을 갖춘 플레이어를 위한 리그',
    minRating: 1000,
    order: 2
  },
  gold: {
    id: 'gold',
    name: '골드 리그',
    color: '#ffd700',
    icon: '🥇',
    description: '숙련된 플레이어를 위한 리그',
    minRating: 1500,
    order: 3
  },
  platinum: {
    id: 'platinum',
    name: '플래티넘 리그',
    color: '#e5e4e2',
    icon: '💎',
    description: '최상위 플레이어를 위한 엘리트 리그',
    minRating: 2000,
    order: 4
  },
};

// 사용자의 역할에 따라 접근 가능한 리그 목록 결정
export function determineUserLeagues(roles: string[]): string[] {
  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    return ['bronze']; // 기본 리그
  }
  
  const leagues = new Set<string>();
  
  // 브론즈 리그는 기본적으로 모든 사용자에게 부여
  leagues.add('bronze');
  
  // 역할 기반 리그 할당
  roles.forEach(roleId => {
    const league = ROLE_TO_LEAGUE_MAP[roleId];
    if (league) {
      leagues.add(league);
    }
    
    // 특별 역할 처리
    const specialLeagues = SPECIAL_ROLES[roleId];
    if (specialLeagues) {
      specialLeagues.forEach(league => leagues.add(league));
    }
  });
  
  return Array.from(leagues);
}

// 사용자의 주요 리그(가장 높은 등급의 리그) 결정
export function getPrimaryLeague(leagues: string[]): string {
  // 리그 우선순위 (높은 등급부터)
  const leaguePriority = ['platinum', 'gold', 'silver', 'bronze'];
  
  // 사용자가 접근 가능한 가장 높은 등급의 리그 찾기
  for (const league of leaguePriority) {
    if (leagues.includes(league)) {
      return league;
    }
  }
  
  return 'bronze'; // 기본 리그
}

// 리그 정보 조회
export function getLeagueInfo(leagueId: string) {
  return LEAGUES[leagueId as keyof typeof LEAGUES] || {
    id: leagueId,
    name: leagueId.charAt(0).toUpperCase() + leagueId.slice(1) + ' League',
    color: '#888888',
    icon: '🏆',
    description: 'A league for battlers',
    minRating: 0,
    order: 0
  };
}

// 해당 리그 접근 권한이 있는지 확인
export function hasLeagueAccess(leagues: string[], leagueId: string): boolean {
  return leagues.includes(leagueId);
}

// 역할 ID로부터 역할 이름 조회 (개발용 헬퍼 함수)
export function getRoleNameFromId(roleId: string): string {
  const leagueId = ROLE_TO_LEAGUE_MAP[roleId];
  if (leagueId) {
    const league = LEAGUES[leagueId as keyof typeof LEAGUES];
    return league ? `${league.name} 역할` : '알 수 없는 역할';
  }
  
  // 특별 역할 처리
  const specialLeagues = SPECIAL_ROLES[roleId];
  if (specialLeagues && specialLeagues.length > 0) {
    const leagueNames = specialLeagues.map(leagueId => {
      const league = LEAGUES[leagueId as keyof typeof LEAGUES];
      return league ? league.name : leagueId;
    }).join(', ');
    
    return `특별 역할 (${leagueNames})`;
  }
  
  return '일반 역할';
}

// 사용자 역할 설명 생성 (사용자 경험 개선용)
export function generateRoleDescription(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return '역할 없음 (기본 브론즈 리그에 속합니다)';
  }
  
  const leagues = determineUserLeagues(roles);
  const primaryLeague = getPrimaryLeague(leagues);
  const primaryLeagueInfo = getLeagueInfo(primaryLeague);
  
  let description = `주 리그: ${primaryLeagueInfo.name} (${primaryLeagueInfo.icon})`;
  
  if (leagues.length > 1) {
    const otherLeagues = leagues
      .filter(league => league !== primaryLeague)
      .map(league => getLeagueInfo(league).name)
      .join(', ');
    
    description += `\n접근 가능한 추가 리그: ${otherLeagues}`;
  }
  
  return description;
}
