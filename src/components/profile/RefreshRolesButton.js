// src/components/profile/RefreshRolesButton.js
import React, { useState } from 'react';
import { refreshUserRolesAndLeagues } from '../../services/leagueSystem';
import './RefreshRolesButton.css';

const RefreshRolesButton = ({ userId, onRolesUpdated }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle', 'refreshing', 'success', 'error'
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [error, setError] = useState(null);
  
  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setStatus('refreshing');
    setError(null);
    
    try {
      // Call the service to refresh roles and leagues
      const result = await refreshUserRolesAndLeagues(userId);
      
      // Success!
      setStatus('success');
      setLastRefreshed(new Date());
      
      // Call the callback if provided
      if (onRolesUpdated && typeof onRolesUpdated === 'function') {
        onRolesUpdated(result);
      }
      
      // Reset status after a delay
      setTimeout(() => {
        setStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Error refreshing Discord roles:', err);
      setStatus('error');
      setError(err.message || 'Failed to refresh Discord roles');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Render different content based on status
  const renderStatusContent = () => {
    switch (status) {
      case 'refreshing':
        return (
          <div className="refresh-status refreshing">
            <div className="refresh-spinner"></div>
            <span>Refreshing roles...</span>
          </div>
        );
      
      case 'success':
        return (
          <div className="refresh-status success">
            <div className="refresh-icon">✓</div>
            <span>Roles updated successfully!</span>
          </div>
        );
      
      case 'error':
        return (
          <div className="refresh-status error">
            <div className="refresh-icon">✕</div>
            <span>{error || 'An error occurred'}</span>
          </div>
        );
      
      case 'idle':
      default:
        return lastRefreshed ? (
          <div className="refresh-status idle">
            <span>Last refreshed: {lastRefreshed.toLocaleTimeString()}</span>
          </div>
        ) : null;
    }
  };
  
  return (
    <div className="refresh-roles-container">
      <button 
        className={`refresh-roles-button ${status}`}
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        <i className="refresh-icon"></i>
        Refresh Discord Roles
      </button>
      
      {renderStatusContent()}
      
      <div className="roles-info">
        <p>
          Refresh your roles to update your league eligibility.
          New Discord roles will be reflected immediately.
        </p>
      </div>
    </div>
  );
};

export default RefreshRolesButton;