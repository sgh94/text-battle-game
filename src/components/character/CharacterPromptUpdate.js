// src/components/character/CharacterPromptUpdate.js
import React, { useState, useEffect } from 'react';
import { 
  updateCharacterPrompt, 
  getPromptCooldownInfo,
  getUserCharacter
} from '../../services/characterService';
import LoadingSpinner from '../common/LoadingSpinner';
import './CharacterPromptUpdate.css';

const CharacterPromptUpdate = ({ userId }) => {
  const [character, setCharacter] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [cooldownInfo, setCooldownInfo] = useState({ 
    canUpdate: false, 
    hoursRemaining: 12,
    hasCharacter: false
  });
  const [countdown, setCountdown] = useState('');
  
  // Load character and cooldown info
  useEffect(() => {
    const loadCharacterData = async () => {
      try {
        setIsLoading(true);
        
        // Get character data
        const characterData = await getUserCharacter(userId);
        
        if (characterData) {
          setCharacter(characterData);
          setPrompt(characterData.prompt || '');
          
          // Get cooldown info
          const cooldown = await getPromptCooldownInfo(userId);
          setCooldownInfo(cooldown);
        } else {
          setCooldownInfo({ 
            canUpdate: false, 
            hoursRemaining: 0,
            hasCharacter: false
          });
        }
      } catch (err) {
        console.error('Error loading character data:', err);
        setError('Failed to load character information');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCharacterData();
    
    // Refresh cooldown info every minute
    const interval = setInterval(() => {
      if (userId) {
        getPromptCooldownInfo(userId)
          .then(info => setCooldownInfo(info))
          .catch(err => console.error('Error refreshing cooldown:', err));
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [userId]);
  
  // Update countdown timer every second
  useEffect(() => {
    if (!cooldownInfo.canUpdate && cooldownInfo.lastUpdateTime) {
      const updateCountdown = () => {
        const now = new Date();
        const lastUpdate = new Date(cooldownInfo.lastUpdateTime);
        const nextUpdateTime = new Date(lastUpdate.getTime() + (12 * 60 * 60 * 1000));
        const timeRemaining = nextUpdateTime - now;
        
        if (timeRemaining <= 0) {
          setCooldownInfo(prev => ({ ...prev, canUpdate: true, hoursRemaining: 0 }));
          setCountdown('');
          return;
        }
        
        // Format the countdown as hours:minutes:seconds
        const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
        
        setCountdown(
          `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };
      
      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);
      
      return () => clearInterval(timer);
    }
  }, [cooldownInfo.canUpdate, cooldownInfo.lastUpdateTime]);
  
  // Handle prompt update
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!cooldownInfo.canUpdate || isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await updateCharacterPrompt(userId, prompt);
      
      // Update cooldown info
      setCooldownInfo({ 
        canUpdate: false, 
        hoursRemaining: 12,
        hasCharacter: true,
        lastUpdateTime: new Date()
      });
      
      // Update character in state
      setCharacter(prev => ({
        ...prev,
        prompt,
        lastPromptUpdate: new Date()
      }));
      
      // Show success message (we'll use the cooldown UI for this)
    } catch (err) {
      console.error('Error updating prompt:', err);
      setError(err.message || 'Failed to update prompt');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="prompt-update-loading">
        <LoadingSpinner />
        <p>Loading character data...</p>
      </div>
    );
  }
  
  if (!cooldownInfo.hasCharacter) {
    return (
      <div className="prompt-update-error">
        <p>You don't have a character yet. Create a character to set a prompt.</p>
      </div>
    );
  }
  
  return (
    <div className="character-prompt-update">
      <div className="prompt-header">
        <h2>Update Character Prompt</h2>
        <div className={`prompt-status ${cooldownInfo.canUpdate ? 'ready' : 'cooldown'}`}>
          {cooldownInfo.canUpdate ? (
            <span className="ready-label">Ready to Update</span>
          ) : (
            <div className="cooldown-timer">
              <span className="cooldown-label">Next update in:</span>
              <span className="countdown">{countdown}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="prompt-info">
        <p>
          Your character prompt defines how your character behaves in battles.
          You can update it once every 12 hours.
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="prompt-form">
        <div className="form-group">
          <label htmlFor="character-prompt">Character Prompt:</label>
          <textarea
            id="character-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
            disabled={!cooldownInfo.canUpdate || isSubmitting}
            placeholder="Describe your character's personality, fighting style, strengths, and weaknesses..."
            className={!cooldownInfo.canUpdate ? 'disabled' : ''}
          />
        </div>
        
        {error && (
          <div className="prompt-error">
            <p>{error}</p>
          </div>
        )}
        
        <div className="prompt-actions">
          <button 
            type="submit" 
            disabled={!cooldownInfo.canUpdate || isSubmitting}
            className={`update-button ${!cooldownInfo.canUpdate ? 'disabled' : ''}`}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="small" />
                <span>Updating...</span>
              </>
            ) : (
              'Update Prompt'
            )}
          </button>
          
          <div className="character-details">
            <p>Character: <strong>{character.name}</strong></p>
            <p>Last updated: {character.lastPromptUpdate 
              ? new Date(character.lastPromptUpdate.seconds * 1000).toLocaleString() 
              : 'Never'}</p>
          </div>
        </div>
      </form>
      
      <div className="prompt-tips">
        <h3>Tips for Effective Prompts:</h3>
        <ul>
          <li>Be specific about your character's fighting style</li>
          <li>Include strengths but also weaknesses for balance</li>
          <li>Define your character's personality and how they react</li>
          <li>Consider how your character approaches different opponents</li>
        </ul>
      </div>
    </div>
  );
};

export default CharacterPromptUpdate;