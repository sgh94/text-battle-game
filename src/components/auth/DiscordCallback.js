// src/components/auth/DiscordCallback.js
import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { handleDiscordCallback } from '../../services/discordAuth';
import { updateUserLeagues } from '../../services/leagueSystem';
import LoadingSpinner from '../common/LoadingSpinner';
import './DiscordCallback.css';

const DiscordCallback = () => {
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState(null);
  const history = useHistory();
  const location = useLocation();

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        // Extract the code from the URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code provided');
        }
        
        setStatus('connecting');
        
        // Process the OAuth code
        const result = await handleDiscordCallback(code);
        
        setUserData(result);
        setStatus('connected');
        
        // Update user leagues based on Discord roles
        if (result.user && result.user.uid && result.discordData.roles) {
          await updateUserLeagues(result.user.uid, result.discordData.roles);
        }
        
        // Redirect to the dashboard after a short delay
        setTimeout(() => {
          history.push('/dashboard');
        }, 2000);
      } catch (err) {
        console.error('Error during Discord authentication:', err);
        setError(err.message || 'Failed to authenticate with Discord');
        setStatus('error');
      }
    };
    
    processOAuthCallback();
  }, [location, history]);

  // Different views based on the status
  const renderContent = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="callback-status">
            <LoadingSpinner />
            <p>Processing your Discord login...</p>
          </div>
        );
      
      case 'connecting':
        return (
          <div className="callback-status">
            <LoadingSpinner />
            <p>Connecting to Discord...</p>
          </div>
        );
      
      case 'connected':
        return (
          <div className="callback-status success">
            <div className="success-icon">✓</div>
            <h3>Successfully connected!</h3>
            <p>Welcome, {userData?.discordData?.username || 'Player'}!</p>
            <p>Redirecting to dashboard...</p>
          </div>
        );
      
      case 'error':
        return (
          <div className="callback-status error">
            <div className="error-icon">✕</div>
            <h3>Connection Error</h3>
            <p>{error || 'An unexpected error occurred'}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.href = '/'}
            >
              Return to Login
            </button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="discord-callback-container">
      <div className="callback-card">
        <h2>Discord Authentication</h2>
        {renderContent()}
      </div>
    </div>
  );
};

export default DiscordCallback;