// Common types used throughout the application

// User data stored in KV
export interface User {
  address: string;
  createdAt: number;
  lastLogin: number;
}

// Character data stored in KV
export interface Character {
  id: string;
  owner: string;
  name: string;
  traits: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: number;
}

// Battle result stored in KV
export interface Battle {
  id: string;
  character1: string;
  character2: string;
  winner: string;
  isDraw: boolean;
  explanation: string;
  timestamp: number;
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
