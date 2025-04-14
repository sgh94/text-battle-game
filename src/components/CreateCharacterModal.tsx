'use client';

import { useState, useEffect } from 'react';
import { useWeb3 } from '@/providers/Web3Provider';

interface CreateCharacterModalProps {
  authHeader: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCharacterModal({
  authHeader,
  onClose,
  onSuccess,
}: CreateCharacterModalProps) {
  const { signAuthMessage } = useWeb3();
  const [name, setName] = useState('');
  const [traits, setTraits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentAuthHeader, setCurrentAuthHeader] = useState(authHeader);

  // Update current state when authHeader changes
  useEffect(() => {
    if (authHeader) {
      setCurrentAuthHeader(authHeader);
    }
  }, [authHeader]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !traits.trim()) {
      setError('Name and traits are required');
      return;
    }
    
    // Try to create a new auth header if one doesn't exist
    let header = currentAuthHeader;
    if (!header) {
      try {
        const newAuthHeader = await signAuthMessage();
        if (!newAuthHeader) {
          setError('Failed to authenticate. Please try again.');
          return;
        }
        header = newAuthHeader;
        setCurrentAuthHeader(newAuthHeader);
      } catch (error: any) {
        setError(error?.message || 'Authentication failed');
        return;
      }
    }
    
    try {
      setIsSubmitting(true);
      setError('');
      
      const response = await fetch('/api/character', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': header,
        },
        body: JSON.stringify({ name, traits }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // If authentication error, try to create a new header
        if (response.status === 401) {
          const newHeader = await signAuthMessage();
          if (newHeader) {
            setCurrentAuthHeader(newHeader);
            throw new Error('Authentication expired. Please try again.');
          } else {
            throw new Error('Failed to re-authenticate. Please reconnect your wallet.');
          }
        }
        throw new Error(data.error || 'Failed to create character');
      }
      
      onSuccess();
    } catch (error: any) {
      setError(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Create Character</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Character Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-700 rounded-md border border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter character name"
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="traits" className="block text-sm font-medium mb-1">
              Character Traits
            </label>
            <textarea
              id="traits"
              value={traits}
              onChange={(e) => setTraits(e.target.value)}
              rows={4}
              className="w-full bg-gray-700 rounded-md border border-gray-600 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Describe your character's traits, abilities, and personality"
            />
          </div>
          
          {error && (
            <div className="mb-4 text-red-500 text-sm">{error}</div>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}