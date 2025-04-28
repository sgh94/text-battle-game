'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { getDiscordAuthUrl } from '@/lib/discord-api';

// Discord 사용자 정보 타입 정의
interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  roles: string[];
  leagues: string[];
  primaryLeague: string;
}

// Discord 인증 Context 타입 정의
interface DiscordAuthContextType {
  user: DiscordUser | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  login: () => void;
  logout: () => void;
  refreshRoles: () => Promise<void>;
}

// 로컬 스토리지 키
const AUTH_STORAGE_KEY = 'text-battle-discord-auth';

// Context 생성
const DiscordAuthContext = createContext<DiscordAuthContextType>({
  user: null,
  isConnected: false,
  isConnecting: false,
  error: null,
  login: () => {},
  logout: () => {},
  refreshRoles: async () => {},
});

// Provider 컴포넌트
export function DiscordAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초기화 시 로컬 스토리지에서 인증 정보 로드
  useEffect(() => {
    const loadAuthData = () => {
      try {
        // 브라우저 환경일 때만 실행
        if (typeof window === 'undefined') return;
        
        const storedData = localStorage.getItem(AUTH_STORAGE_KEY);
        
        if (storedData) {
          const userData = JSON.parse(storedData) as DiscordUser;
          setUser(userData);
          setIsConnected(true);
        }
      } catch (err) {
        console.error('Error loading authentication data:', err);
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    };

    loadAuthData();
  }, []);

  // Discord 로그인 페이지로 리디렉션
  const login = () => {
    setIsConnecting(true);
    setError(null);

    try {
      const authUrl = getDiscordAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : '인증 URL 생성 실패');
      console.error('Error generating auth URL:', err);
    }
  };

  // 로그아웃
  const logout = () => {
    setUser(null);
    setIsConnected(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // Discord 역할 갱신
  const refreshRoles = async () => {
    if (!user || !user.id) {
      setError('역할을 업데이트하려면 로그인해야 합니다.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // 역할 갱신 API 호출
      const response = await fetch('/api/discord/refresh-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: '알 수 없는 오류', code: 'UNKNOWN_ERROR' }));
        
        // 토큰 만료 오류인 경우 자동 로그아웃
        if (errorData.code === 'AUTH_EXPIRED') {
          logout();
          throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
        }
        
        throw new Error(errorData.error || `역할 갱신 실패 (${response.status})`);
      }

      // 업데이트된 사용자 정보로 상태 갱신
      const updatedUser = await response.json();
      setUser(updatedUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '역할 갱신 실패');
      console.error('Error refreshing roles:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  // Context 값
  const value: DiscordAuthContextType = {
    user,
    isConnected,
    isConnecting,
    error,
    login,
    logout,
    refreshRoles,
  };

  return (
    <DiscordAuthContext.Provider value={value}>
      {children}
    </DiscordAuthContext.Provider>
  );
}

// Hook export
export function useDiscordAuth() {
  return useContext(DiscordAuthContext);
}

// 사용자 리그 접근 권한 체크 헬퍼 함수
export function useLeagueAccess(leagueId: string) {
  const { user, isConnected } = useDiscordAuth();
  
  if (!isConnected || !user) {
    return false;
  }
  
  return user.leagues.includes(leagueId);
}

// 캐릭터 액세스 권한 체크 헬퍼 함수 (계정당 하나의 캐릭터)
export function useCharacterAccess() {
  const { user, isConnected } = useDiscordAuth();
  
  return {
    canAccess: isConnected && !!user,
    userId: user?.id || null,
  };
}
