'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Client component: Directly reading URL parameters
function CallbackHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<{ username?: string } | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract code and state parameters directly from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (!code) {
          throw new Error('Authentication code is missing');
        }

        // Clean URL parameters
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, document.title, url.href);

        setStatus('connecting');

        // Exchange authentication token
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
          throw new Error(errorData.error || 'An error occurred during authentication');
        }

        const tokenData = await tokenResponse.json();

        // Store tokens
        localStorage.setItem('discord_access_token', tokenData.access_token);
        localStorage.setItem('discord_refresh_token', tokenData.refresh_token);
        localStorage.setItem('discord_expires_at', String(Date.now() + tokenData.expires_in * 1000));

        // Get user information
        const userResponse = await fetch('/api/auth/user', {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
          },
        });

        if (!userResponse.ok) {
          throw new Error('Failed to retrieve user information');
        }

        const userData = await userResponse.json();
        setUserData(userData);
        setStatus('success');

        // Redirect to main page after authentication
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);

      } catch (err) {
        console.error('callback error:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      }
    };

    // Execute only in browser environment
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        handleCallback();
      } else {
        // Redirect to home if code is missing
        router.push('/');
      }
    }
  }, [router]);

  if (status === 'processing' || status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-medium mb-2">
            {status === 'processing' ? 'Processing authentication...' : 'Connecting to Discord...'}
          </h2>
          <p className="text-gray-600">Please wait a moment.</p>
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
          <h2 className="text-xl font-medium text-red-600 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error || 'A problem occurred during authentication.'}</p>
          <Link href="/">
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors">
              Return to Home
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
          <h2 className="text-xl font-medium text-green-600 mb-2">Authentication Successful!</h2>
          {userData && 'username' in userData && (
            <div className="mb-4">
              <p className="font-medium">Welcome, {userData.username}!</p>
            </div>
          )}
          <p className="text-gray-600 mb-4">Redirecting to game page shortly...</p>
        </div>
      </div>
    );
  }

  return null;
}

// Main component using Suspense boundary
export default function DiscordCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin h-10 w-10 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
          </div>
          <h2 className="text-xl font-medium mb-2">Loading...</h2>
        </div>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
