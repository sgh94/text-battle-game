// Common types used throughout the application

// User data stored in KV
export interface User extends Record<string, unknown> {
  address: string;
  createdAt: number;
  lastLogin: number;
}

// Character data stored in KV
export interface Character extends Record<string, unknown> {
  id: string;
  owner: string;
  name: string;
  traits: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  league: string; // Added league field
  createdAt: number;
}

// Battle result stored in KV
export interface Battle extends Record<string, unknown> {
  id: string;
  character1: string;
  character2: string;
  winner: string;
  isDraw: boolean;
  explanation: string; // Keep for backward compatibility
  narrative: string;   // Add narrative field for detailed battle description
  timestamp: number;
  league: string;      // Added league field
}

// Response from LLM for battle decision
export interface BattleResult {
  winner: 'character1' | 'character2';
  isDraw: boolean;
  explanation: string;
}

// Updated character stats after battle
export interface UpdatedStats {
  winner: Character;
  loser: Character;
}

// KV specific types
export interface ScoreMember {
  score: number;
  member: string;
}

export interface RankingResult {
  member: string;
  score: number;
}

// User ranking data
export interface UserRanking {
  rank: number;
  elo: number;
  characterId: string;
  characterName: string;
}
