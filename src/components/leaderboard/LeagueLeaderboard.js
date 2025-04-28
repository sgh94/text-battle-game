// src/components/leaderboard/LeagueLeaderboard.js
import React, { useState, useEffect } from 'react';
import { fetchLeagueLeaderboard } from '../../services/leaderboardService';
import { getLeagueInfo } from '../../services/leagueSystem';
import LoadingSpinner from '../common/LoadingSpinner';
import './LeagueLeaderboard.css';

const LeagueLeaderboard = ({ leagueId, userId }) => {
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [leagueInfo, setLeagueInfo] = useState(null);
  
  useEffect(() => {
    // Get league info
    const league = getLeagueInfo(leagueId);
    setLeagueInfo(league);
    
    // Load leaderboard data
    const loadLeaderboard = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchLeagueLeaderboard(leagueId, userId);
        setLeaderboardData(data);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
        setError(err.message || 'Failed to load leaderboard data');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLeaderboard();
  }, [leagueId, userId]);
  
  if (isLoading) {
    return (
      <div className="leaderboard-loading">
        <LoadingSpinner />
        <p>Loading leaderboard data...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="leaderboard-error">
        <div className="error-icon">⚠️</div>
        <h3>Error Loading Leaderboard</h3>
        <p>{error}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (!leaderboardData || !leagueInfo) {
    return (
      <div className="leaderboard-error">
        <p>No leaderboard data available</p>
      </div>
    );
  }
  
  const { topPlayers, userRanking, leagueStats } = leaderboardData;
  
  return (
    <div className="league-leaderboard">
      <div className="leaderboard-header" style={{ backgroundColor: leagueInfo.color }}>
        <div className="league-icon">{leagueInfo.icon}</div>
        <div className="league-title">
          <h2>{leagueInfo.name} Leaderboard</h2>
          <p>{leagueInfo.description}</p>
        </div>
      </div>
      
      <div className="league-stats">
        <div className="stat-item">
          <span className="stat-value">{leagueStats.totalPlayers}</span>
          <span className="stat-label">Players</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{leagueStats.topRating}</span>
          <span className="stat-label">Top Rating</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{leagueStats.averageRating}</span>
          <span className="stat-label">Avg Rating</span>
        </div>
      </div>
      
      {/* Top 10 Players */}
      <div className="top-players-section">
        <h3>Top 10 Players</h3>
        
        <div className="leaderboard-table">
          <div className="table-header">
            <div className="rank-col">Rank</div>
            <div className="player-col">Player</div>
            <div className="rating-col">Rating</div>
            <div className="record-col">W-L-D</div>
            <div className="winrate-col">Win %</div>
          </div>
          
          {topPlayers.length > 0 ? (
            <div className="table-body">
              {topPlayers.map((player) => (
                <div 
                  key={player.id} 
                  className={`table-row ${player.id === userId ? 'current-user' : ''}`}
                >
                  <div className="rank-col">
                    {player.rank <= 3 ? (
                      <span className={`top-rank rank-${player.rank}`}>
                        {player.rank}
                      </span>
                    ) : (
                      player.rank
                    )}
                  </div>
                  <div className="player-col">
                    {player.avatar && (
                      <img 
                        src={player.avatar} 
                        alt={player.name} 
                        className="player-avatar" 
                      />
                    )}
                    <span className="player-name">{player.name}</span>
                  </div>
                  <div className="rating-col">{player.rating}</div>
                  <div className="record-col">
                    {player.wins}-{player.losses}-{player.draws}
                  </div>
                  <div className="winrate-col">{player.winRate}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-leaderboard">
              <p>No players in this league yet!</p>
            </div>
          )}
        </div>
      </div>
      
      {/* User's Ranking (if not in top 10) */}
      {userRanking && userRanking.rank > 10 && (
        <div className="user-ranking-section">
          <h3>Your Ranking</h3>
          
          <div className="leaderboard-table">
            <div className="table-header">
              <div className="rank-col">Rank</div>
              <div className="player-col">Player</div>
              <div className="rating-col">Rating</div>
              <div className="record-col">W-L-D</div>
              <div className="winrate-col">Win %</div>
            </div>
            
            <div className="table-body">
              <div className="table-row current-user">
                <div className="rank-col">{userRanking.rank}</div>
                <div className="player-col">
                  {userRanking.avatar && (
                    <img 
                      src={userRanking.avatar} 
                      alt={userRanking.name} 
                      className="player-avatar" 
                    />
                  )}
                  <span className="player-name">{userRanking.name}</span>
                </div>
                <div className="rating-col">{userRanking.rating}</div>
                <div className="record-col">
                  {userRanking.wins}-{userRanking.losses}-{userRanking.draws}
                </div>
                <div className="winrate-col">{userRanking.winRate}</div>
              </div>
            </div>
          </div>
          
          <div className="ranking-info">
            <p>
              You are ranked #{userRanking.rank} out of {leagueStats.totalPlayers} players
              in the {leagueInfo.name}.
            </p>
          </div>
        </div>
      )}
      
      {/* Recent Matches */}
      {leagueStats.recentMatches && leagueStats.recentMatches.length > 0 && (
        <div className="recent-matches-section">
          <h3>Recent Matches</h3>
          
          <div className="matches-list">
            {leagueStats.recentMatches.map((match) => (
              <div key={match.id} className="match-item">
                <div className="match-players">
                  <span className="player1">{match.player1Name}</span>
                  <span className="vs">vs</span>
                  <span className="player2">{match.player2Name}</span>
                </div>
                <div className="match-result">
                  <span className="score">{match.player1Score} - {match.player2Score}</span>
                  <span className="date">{new Date(match.completedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeagueLeaderboard;