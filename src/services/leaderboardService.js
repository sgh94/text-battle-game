// src/services/leaderboardService.js
import { db } from '../firebase';
import { getUserCharacter } from './characterService';
import { getLeagueInfo } from './leagueSystem';

// Fetch league leaderboard with top 10 + user ranking
export const fetchLeagueLeaderboard = async (leagueId, userId = null) => {
  try {
    // Validate the league
    const leagueInfo = getLeagueInfo(leagueId);
    if (!leagueInfo) {
      throw new Error(`Invalid league: ${leagueId}`);
    }

    // Get top 10 players in the league
    const topPlayersSnapshot = await db.collection('characters')
      .where('league', '==', leagueId)
      .orderBy('rating', 'desc')
      .limit(10)
      .get();

    const topPlayers = [];
    topPlayersSnapshot.forEach((doc, index) => {
      const character = doc.data();
      topPlayers.push({
        rank: index + 1,
        id: doc.id,
        name: character.name,
        rating: character.rating,
        wins: character.wins || 0,
        losses: character.losses || 0,
        draws: character.draws || 0,
        winRate: character.matchesPlayed > 0
          ? ((character.wins / character.matchesPlayed) * 100).toFixed(1) + '%'
          : '0.0%',
        createdBy: character.createdBy || 'Unknown Player',
        avatar: character.avatar,
      });
    });

    // If userId is provided, get the user's ranking
    let userRanking = null;
    if (userId) {
      // Get user's character
      const userCharacter = await getUserCharacter(userId);

      if (userCharacter && userCharacter.league === leagueId) {
        // Count how many players have a higher rating
        const higherRankedCount = await db.collection('characters')
          .where('league', '==', leagueId)
          .where('rating', '>', userCharacter.rating)
          .get()
          .then(snapshot => snapshot.size);

        const userRank = higherRankedCount + 1;

        userRanking = {
          rank: userRank,
          id: userId,
          name: userCharacter.name,
          rating: userCharacter.rating,
          wins: userCharacter.wins || 0,
          losses: userCharacter.losses || 0,
          draws: userCharacter.draws || 0,
          winRate: userCharacter.matchesPlayed > 0
            ? ((userCharacter.wins / userCharacter.matchesPlayed) * 100).toFixed(1) + '%'
            : '0.0%',
          createdBy: userCharacter.createdBy || 'Unknown Player',
          avatar: userCharacter.avatar,
        };

        // Check if user is already in top 10
        const isInTop10 = topPlayers.some(player => player.id === userId);

        if (!isInTop10 && userRank > 10) {
          // User is not in top 10, we'll add them separately
          // We don't add them to topPlayers to keep it strictly top 10
        }
      }
    }

    // Get total player count for the league
    const totalPlayersCount = await db.collection('characters')
      .where('league', '==', leagueId)
      .get()
      .then(snapshot => snapshot.size);

    // Get high-level league stats
    const leagueStats = {
      totalPlayers: totalPlayersCount,
      topRating: topPlayers.length > 0 ? topPlayers[0].rating : 0,
      averageRating: await getAverageLeagueRating(leagueId),
      recentMatches: await getRecentLeagueMatches(leagueId, 5),
    };

    return {
      leagueInfo,
      topPlayers,
      userRanking,
      leagueStats,
    };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    throw error;
  }
};

// Get average rating for a league
const getAverageLeagueRating = async (leagueId) => {
  try {
    const snapshot = await db.collection('characters')
      .where('league', '==', leagueId)
      .get();

    if (snapshot.empty) {
      return 1000; // Default rating
    }

    let totalRating = 0;
    let count = 0;

    snapshot.forEach(doc => {
      const character = doc.data();
      totalRating += character.rating || 1000;
      count++;
    });

    return Math.round(totalRating / count);
  } catch (error) {
    console.error('Error calculating average rating:', error);
    return 1000; // Default rating on error
  }
};

// Get recent matches for a league
const getRecentLeagueMatches = async (leagueId, limit = 5) => {
  try {
    // Assuming there's a 'matches' collection
    const snapshot = await db.collection('matches')
      .where('league', '==', leagueId)
      .orderBy('completedAt', 'desc')
      .limit(limit)
      .get();

    const matches = [];
    snapshot.forEach(doc => {
      const match = doc.data();
      matches.push({
        id: doc.id,
        player1Name: match.player1Name,
        player2Name: match.player2Name,
        winner: match.winner,
        player1Score: match.player1Score,
        player2Score: match.player2Score,
        completedAt: match.completedAt.toDate(),
      });
    });

    return matches;
  } catch (error) {
    console.error('Error fetching recent matches:', error);
    return [];
  }
};

// Fetch all league leaderboards (for admins or overview)
export const fetchAllLeagueLeaderboards = async (limit = 5) => {
  try {
    // Import the league system to get all league IDs
    const { LEAGUES } = await import('./leagueSystem');

    const results = {};

    for (const leagueId of Object.keys(LEAGUES)) {
      // For each league, get the top players
      const topPlayersSnapshot = await db.collection('characters')
        .where('league', '==', leagueId)
        .orderBy('rating', 'desc')
        .limit(limit)
        .get();

      const topPlayers = [];
      topPlayersSnapshot.forEach((doc, index) => {
        const character = doc.data();
        topPlayers.push({
          rank: index + 1,
          id: doc.id,
          name: character.name,
          rating: character.rating,
          wins: character.wins || 0,
          losses: character.losses || 0,
        });
      });

      // Get total player count for the league
      const totalPlayersCount = await db.collection('characters')
        .where('league', '==', leagueId)
        .get()
        .then(snapshot => snapshot.size);

      results[leagueId] = {
        leagueInfo: LEAGUES[leagueId],
        topPlayers,
        totalPlayers: totalPlayersCount,
      };
    }

    return results;
  } catch (error) {
    console.error('Error fetching all leaderboards:', error);
    throw error;
  }
};

// Get user ranking across all leagues
export const getUserRankings = async (userId) => {
  try {
    const character = await getUserCharacter(userId);

    if (!character) {
      return null;
    }

    // Get user's leagues
    const leagues = character.allLeagues || [character.league];
    const results = {};

    for (const leagueId of leagues) {
      // Count how many players have a higher rating in this league
      const higherRankedCount = await db.collection('characters')
        .where('league', '==', leagueId)
        .where('rating', '>', character.rating)
        .get()
        .then(snapshot => snapshot.size);

      // Get total players in this league
      const totalPlayersCount = await db.collection('characters')
        .where('league', '==', leagueId)
        .get()
        .then(snapshot => snapshot.size);

      results[leagueId] = {
        rank: higherRankedCount + 1,
        totalPlayers: totalPlayersCount,
        rating: character.rating,
        wins: character.wins || 0,
        losses: character.losses || 0,
        draws: character.draws || 0,
      };
    }

    return {
      character: {
        id: character.id,
        name: character.name,
        avatar: character.avatar,
      },
      rankings: results,
    };
  } catch (error) {
    console.error('Error fetching user rankings:', error);
    throw error;
  }
};

// Get user's match history
export const getUserMatchHistory = async (userId, limit = 10) => {
  try {
    // Fetch matches where user was either player1 or player2
    const player1Matches = await db.collection('matches')
      .where('player1Id', '==', userId)
      .orderBy('completedAt', 'desc')
      .limit(limit)
      .get();

    const player2Matches = await db.collection('matches')
      .where('player2Id', '==', userId)
      .orderBy('completedAt', 'desc')
      .limit(limit)
      .get();

    // Combine and sort matches
    const matches = [];

    player1Matches.forEach(doc => {
      const match = doc.data();
      matches.push({
        id: doc.id,
        opponentId: match.player2Id,
        opponentName: match.player2Name,
        result: match.winner === userId ? 'win' : (match.winner === null ? 'draw' : 'loss'),
        playerScore: match.player1Score,
        opponentScore: match.player2Score,
        completedAt: match.completedAt.toDate(),
        league: match.league,
      });
    });

    player2Matches.forEach(doc => {
      const match = doc.data();
      matches.push({
        id: doc.id,
        opponentId: match.player1Id,
        opponentName: match.player1Name,
        result: match.winner === userId ? 'win' : (match.winner === null ? 'draw' : 'loss'),
        playerScore: match.player2Score,
        opponentScore: match.player1Score,
        completedAt: match.completedAt.toDate(),
        league: match.league,
      });
    });

    // Sort by date, most recent first
    matches.sort((a, b) => b.completedAt - a.completedAt);

    // Trim to limit
    return matches.slice(0, limit);
  } catch (error) {
    console.error('Error fetching user match history:', error);
    throw error;
  }
};

// Get league standings for display
export const getLeagueStandings = async (leagueId, page = 1, pageSize = 20) => {
  try {
    const offset = (page - 1) * pageSize;

    // Get total count for pagination
    const totalCount = await db.collection('characters')
      .where('league', '==', leagueId)
      .get()
      .then(snapshot => snapshot.size);

    // Get paginated characters
    const snapshot = await db.collection('characters')
      .where('league', '==', leagueId)
      .orderBy('rating', 'desc')
      .limit(pageSize)
      .offset(offset)
      .get();

    const standings = [];
    snapshot.forEach((doc, index) => {
      const character = doc.data();
      standings.push({
        rank: offset + index + 1,
        id: doc.id,
        name: character.name,
        rating: character.rating,
        wins: character.wins || 0,
        losses: character.losses || 0,
        draws: character.draws || 0,
        matchesPlayed: character.matchesPlayed || 0,
        winRate: character.matchesPlayed > 0
          ? ((character.wins / character.matchesPlayed) * 100).toFixed(1) + '%'
          : '0.0%',
        createdBy: character.createdBy || 'Unknown Player',
        avatar: character.avatar,
      });
    });

    return {
      standings,
      pagination: {
        totalCount,
        pageCount: Math.ceil(totalCount / pageSize),
        currentPage: page,
        pageSize,
      },
    };
  } catch (error) {
    console.error('Error fetching league standings:', error);
    throw error;
  }
};