'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DiscordCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code provided');
        }
        
        // Call our backend API to exchange the code for tokens and user data
        const response = await fetch('/api/discord/auth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || 'Failed to authenticate with Discord');
        }
        
        const userData = await response.json();
        
        // Store user data in localStorage
        localStorage.setItem('text-battle-discord-auth', JSON.stringify(userData));
        
        setStatus('success');
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/');
        }, 2000);
        
      } catch (error) {
        console.error('Error handling Discord callback:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
      }
    };
    
    handleCallback();
  }, [searchParams, router]);
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {status === 'processing' && 'Connecting to Discord...'}
          {status === 'success' && 'Successfully Connected!'}
          {status === 'error' && 'Connection Failed'}
        </h1>
        
        <div className="flex justify-center mb-6">
          {status === 'processing' && (
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
          )}
          
          {status === 'success' && (
            <div className="bg-green-100 text-green-700 p-4 rounded-md text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p>Your Discord account has been connected! Redirecting...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="bg-red-100 text-red-700 p-4 rounded-md text-center">
              <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="mb-4">{errorMessage || 'Failed to connect to Discord'}</p>
              <button 
                onClick={() => router.push('/')}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Return to Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
