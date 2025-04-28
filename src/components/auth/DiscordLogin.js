// src/components/auth/DiscordLogin.js
import React from 'react';
import { getDiscordAuthUrl } from '../../services/discordAuth';
import discordLogo from '../../assets/discord-logo.svg';
import './DiscordLogin.css';

const DiscordLogin = () => {
  const handleLogin = () => {
    const authUrl = getDiscordAuthUrl();
    window.location.href = authUrl;
  };
  
  return (
    <div className="discord-login-container">
      <h2>Connect with Discord</h2>
      <p>
        Connect your Discord account to join the Text Battle Game. 
        You need to be a member of our Discord server to play!
      </p>
      
      <button 
        className="discord-login-button" 
        onClick={handleLogin}
      >
        <img src={discordLogo} alt="Discord" className="discord-logo" />
        <span>Login with Discord</span>
      </button>
      
      <div className="login-info">
        <p>Connecting will:</p>
        <ul>
          <li>Check your server membership</li>
          <li>Get your roles to determine your leagues</li>
          <li>Create a game account linked to your Discord</li>
        </ul>
      </div>
    </div>
  );
};

export default DiscordLogin;