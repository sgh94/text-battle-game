'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

// 인증 상태 타입
type AuthStatus = 'processing' | 'connecting' | 'success' | 'error';

// 사용자 정보 타입
interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  roles: string[];
  leagues: string[];
  primaryLeague: string;
}

export default function DiscordCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<AuthStatus>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        
        // 사용자가 인증을 취소한 경우
        if (error) {
          if (error === 'access_denied') {
            throw new Error('Discord authentication was canceled.');
          } else {
            throw new Error(`Discord authentication error: ${error}`);
          }
        }
        
        if (!code) {
          throw new Error('No authorization code provided');
        }
        
        setStatus('connecting');
        
        // Discord API에 인증 코드 전송
        const response = await fetch('/api/discord/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });
        
        // 응답 처리
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN_ERROR' }));
          throw new Error(errorData.error || `Failed to authenticate with Discord (${response.status})`);
        }
        
        // 사용자 데이터 추출 및 저장
        const userData: DiscordUser = await response.json();
        setUser(userData);
        
        // 로컬 스토리지에 사용자 데이터 저장
        localStorage.setItem('text-battle-discord-auth', JSON.stringify(userData));
        
        // 성공 상태로 설정
        setStatus('success');
        
        // 잠시 후 홈페이지로 리다이렉트
        setTimeout(() => {
          router.push('/');
        }, 2000);
        
      } catch (error) {
        console.error('Error handling Discord callback:', error);
        setStatus('error');
        
        // 사용자 친화적인 오류 메시지 설정
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('An unknown error occurred during Discord authentication.');
        }
        
        // 에러 코드 설정 (있는 경우)
        setErrorCode((error as any)?.code || 'UNKNOWN_ERROR');
      }
    };
    
    handleCallback();
  }, [searchParams, router]);
  
  // Discord 사용자 아바타 URL 생성
  const getAvatarUrl = () => {
    if (!user || !user.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
  };
  
  // 리그 이모지 매핑
  const leagueEmoji = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '💎',
  };
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        <div className="flex justify-center mb-6">
          <svg width="40" height="30" viewBox="0 0 71 55" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600">
            <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.525289C25.5141 0.443589 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4378C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.435C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978ZM23.7259 37.3253C20.2276 37.3253 17.3451 34.1136 17.3451 30.1693C17.3451 26.225 20.1717 23.0133 23.7259 23.0133C27.308 23.0133 30.1626 26.2532 30.1066 30.1693C30.1066 34.1136 27.28 37.3253 23.7259 37.3253ZM47.3178 37.3253C43.8196 37.3253 40.9371 34.1136 40.9371 30.1693C40.9371 26.225 43.7636 23.0133 47.3178 23.0133C50.9 23.0133 53.7545 26.2532 53.6986 30.1693C53.6986 34.1136 50.9 37.3253 47.3178 37.3253Z" fill="currentColor"/>
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold mb-6 text-center">
          {status === 'processing' && 'Discord 인증 처리 중...'}
          {status === 'connecting' && 'Discord 연결 중...'}
          {status === 'success' && 'Discord 연결 성공!'}
          {status === 'error' && '연결 실패'}
        </h1>
        
        <div className="flex justify-center mb-6">
          {status === 'processing' && (
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
          )}
          
          {status === 'connecting' && (
            <div className="flex flex-col items-center">
              <div className="animate-pulse h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin mb-4"></div>
              <p className="text-gray-600">Discord 서버에서 역할 정보를 가져오는 중...</p>
            </div>
          )}
          
          {status === 'success' && user && (
            <div className="bg-green-50 text-green-700 p-6 rounded-md text-center w-full">
              <div className="flex justify-center mb-2">
                <div className="bg-green-100 rounded-full p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <div className="flex flex-col items-center">
                {getAvatarUrl() ? (
                  <div className="h-20 w-20 rounded-full overflow-hidden mb-4">
                    <img 
                      src={getAvatarUrl()!} 
                      alt={user.username} 
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl text-gray-500">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <p className="text-lg font-medium mb-1">{user.username}</p>
                <p className="text-sm text-gray-600 mb-4">Discord ID: {user.id}</p>
                
                <div className="bg-indigo-100 px-4 py-2 rounded-full mb-4">
                  <span className="font-medium">
                    {user.primaryLeague.charAt(0).toUpperCase() + user.primaryLeague.slice(1)} 리그
                    {' '}
                    {leagueEmoji[user.primaryLeague as keyof typeof leagueEmoji] || '🏆'}
                  </span>
                </div>
                
                <p className="text-sm">인증이 완료되었습니다! 홈 페이지로 이동합니다...</p>
              </div>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-50 text-red-700 p-6 rounded-md text-center w-full">
              <div className="flex justify-center mb-2">
                <div className="bg-red-100 rounded-full p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              
              <p className="text-lg font-medium mb-2">인증 오류</p>
              <p className="mb-4">{errorMessage || '알 수 없는 오류가 발생했습니다.'}</p>
              
              {errorCode && (
                <p className="text-xs text-red-500 mb-4">오류 코드: {errorCode}</p>
              )}
              
              <div className="flex justify-center">
                <button 
                  onClick={() => router.push('/')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                >
                  홈으로 돌아가기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
