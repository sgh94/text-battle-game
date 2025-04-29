'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function DiscordCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (!code) {
          throw new Error('인증 코드가 없습니다');
        }

        setStatus('connecting');
        
        // 인증 토큰 교환
        const tokenResponse = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            code, 
            codeVerifier: localStorage.getItem('discord_code_verifier') 
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          throw new Error(errorData.error || '인증 처리 중 오류가 발생했습니다');
        }

        const tokenData = await tokenResponse.json();
        
        // 토큰 저장
        localStorage.setItem('discord_access_token', tokenData.access_token);
        localStorage.setItem('discord_refresh_token', tokenData.refresh_token);
        localStorage.setItem('discord_expires_at', String(Date.now() + tokenData.expires_in * 1000));
        
        // 사용자 정보 가져오기
        const userResponse = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('사용자 정보를 가져오는데 실패했습니다');
        }

        const userData = await userResponse.json();
        setUserData(userData);
        setStatus('success');
        
        // 인증 완료 후 메인 페이지로 이동
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
        
      } catch (err) {
        console.error('인증 콜백 처리 오류:', err);
        setStatus('error');
        setError(err.message);
      }
    };

    // URL 파라미터에 코드가 있으면 콜백 처리 시작
    const code = searchParams.get('code');
    if (code) {
      // URL 파라미터 정리
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.href);
      }
      
      handleCallback();
    } else {
      // 코드가 없으면 홈으로 리다이렉트
      router.push('/');
    }
  }, [searchParams, router]);

  if (status === 'processing' || status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-medium mb-2">
            {status === 'processing' ? '인증 처리 중...' : '디스코드 연결 중...'}
          </h2>
          <p className="text-gray-600">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="flex justify-center mb-4 text-red-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-red-600 mb-2">인증 오류</h2>
          <p className="text-gray-600 mb-4">{error || '인증 과정에서 문제가 발생했습니다.'}</p>
          <Link href="/">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
              홈으로 돌아가기
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="flex justify-center mb-4 text-green-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-green-600 mb-2">인증 성공!</h2>
          {userData && (
            <div className="mb-4">
              <p className="font-medium">{userData.username} 님 반갑습니다!</p>
            </div>
          )}
          <p className="text-gray-600 mb-4">곧 게임 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function DiscordCallback() {
  return <DiscordCallbackInner />;
}
