import { kv } from '@vercel/kv';
import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from '@/lib/auth';
import { Battle, BattleResult, Character } from '@/types';
import { aiCharacters } from '@/scripts/seed-characters';

// Mock database for local development
const mockCharacterDb = new Map<string, Character>();
const mockBattleDb = new Map<string, Battle>();
const mockCharacterRankings = new Map<string, number>();
const mockUserBattles = new Map<string, string[]>();

// AI 캐릭터 베이스 주소
const AI_BASE_ADDRESS = '0xAI00000000000000000000000000000000000000';

// Start a new battle
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuth(request);
    if (!authResult.isValid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userAddress = authResult.address;
    const { characterId } = await request.json();

    // Validate character ID
    if (!characterId) {
      return NextResponse.json({ error: 'Character ID is required' }, { status: 400 });
    }

    // Get user's character
    let userCharacter: Character | null = null;
    try {
      userCharacter = await kv.hgetall<Character>(`character:${characterId}`);
    } catch (kvError) {
      console.warn('KV database error on fetching character, using mock database:', kvError);
      userCharacter = mockCharacterDb.get(characterId) || null;
    }

    // Verify character exists and belongs to user
    if (!userCharacter) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    if (userCharacter.owner.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized to use this character' }, { status: 403 });
    }

    // Check cooldown
    const lastBattleTime = await getLastBattleTime(characterId);
    const cooldownPeriod = 3 * 60 * 1000; // 3 minutes
    const now = Date.now();

    if (lastBattleTime && now - lastBattleTime < cooldownPeriod) {
      const remainingTime = Math.ceil((lastBattleTime + cooldownPeriod - now) / 1000);
      return NextResponse.json({ 
        error: `Character is on cooldown`,
        remainingTime
      }, { status: 429 });
    }

    // Find opponent based on ELO score
    const opponentCharacter = await findOpponent(userCharacter);

    if (!opponentCharacter) {
      return NextResponse.json({ error: 'No suitable opponent found' }, { status: 404 });
    }

    // Determine battle outcome
    const battleResult = await decideBattle(userCharacter, opponentCharacter);

    // Create battle record
    const battleId = `battle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    let isDraw = battleResult.isDraw;
    let winnerCharacterId = battleResult.winner === 'character1' ? userCharacter.id : opponentCharacter.id;
    
    if (isDraw) {
      winnerCharacterId = 'draw';
    }

    const battle: Battle = {
      id: battleId,
      character1: userCharacter.id,
      character2: opponentCharacter.id,
      winner: winnerCharacterId,
      isDraw,
      explanation: battleResult.explanation,
      timestamp: now
    };

    // Update character stats
    let updatedUserCharacter = { ...userCharacter };
    let updatedOpponentCharacter = { ...opponentCharacter };

    if (isDraw) {
      // Draw: Slight ELO adjustments
      updatedUserCharacter.draws = (updatedUserCharacter.draws || 0) + 1;
      updatedOpponentCharacter.draws = (updatedOpponentCharacter.draws || 0) + 1;
      
      // Small ELO changes for draws
      const eloChange = 5;
      if (updatedUserCharacter.elo < updatedOpponentCharacter.elo) {
        updatedUserCharacter.elo += eloChange;
        updatedOpponentCharacter.elo -= eloChange;
      } else if (updatedUserCharacter.elo > updatedOpponentCharacter.elo) {
        updatedUserCharacter.elo -= eloChange;
        updatedOpponentCharacter.elo += eloChange;
      }
      // If ELO is equal, no change
    } else {
      // Win/Loss: Update stats and ELO
      const winner = battleResult.winner === 'character1' ? updatedUserCharacter : updatedOpponentCharacter;
      const loser = battleResult.winner === 'character1' ? updatedOpponentCharacter : updatedUserCharacter;
      
      winner.wins = (winner.wins || 0) + 1;
      loser.losses = (loser.losses || 0) + 1;
      
      // Calculate ELO change
      const kFactor = 32; // Standard chess K-factor
      const expectedWinProbability = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
      const eloChange = Math.round(kFactor * (1 - expectedWinProbability));
      
      winner.elo += eloChange;
      loser.elo -= eloChange;
    }

    // Save battle
    try {
      // Save battle record
      await kv.hset(`battle:${battleId}`, battle as Record<string, unknown>);
      
      // Add to user's battle list
      await kv.sadd(`user:${userAddress}:battles`, battleId);
      
      // Add to characters' battle lists
      await kv.sadd(`character:${userCharacter.id}:battles`, battleId);
      await kv.sadd(`character:${opponentCharacter.id}:battles`, battleId);
      
      // Update user character
      await kv.hset(`character:${userCharacter.id}`, updatedUserCharacter as Record<string, unknown>);
      
      // Update opponent character if not AI
      if (opponentCharacter.owner !== AI_BASE_ADDRESS) {
        await kv.hset(`character:${opponentCharacter.id}`, updatedOpponentCharacter as Record<string, unknown>);
      }
      
      // Update ELO rankings
      await kv.zadd('characters:ranking', { score: updatedUserCharacter.elo, member: userCharacter.id });
      await kv.zadd('characters:ranking', { score: updatedOpponentCharacter.elo, member: opponentCharacter.id });
    } catch (kvError) {
      console.warn('KV database error on saving battle, using mock database:', kvError);
      
      // Fall back to mock database
      mockBattleDb.set(battleId, battle);
      
      // Add to user's battle list
      const userBattles = mockUserBattles.get(userAddress) || [];
      userBattles.push(battleId);
      mockUserBattles.set(userAddress, userBattles);
      
      // Update character in mock DB
      mockCharacterDb.set(userCharacter.id, updatedUserCharacter);
      if (opponentCharacter.owner !== AI_BASE_ADDRESS) {
        mockCharacterDb.set(opponentCharacter.id, updatedOpponentCharacter);
      }
      
      // Update ELO rankings
      mockCharacterRankings.set(userCharacter.id, updatedUserCharacter.elo);
      mockCharacterRankings.set(opponentCharacter.id, updatedOpponentCharacter.elo);
    }

    return NextResponse.json({ 
      success: true, 
      battle,
      userCharacter: updatedUserCharacter,
      opponentCharacter: updatedOpponentCharacter
    });
  } catch (error) {
    console.error('Error in battle route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get battle details
export async function GET(request: NextRequest) {
  try {
    const battleId = request.nextUrl.searchParams.get('id');
    const characterId = request.nextUrl.searchParams.get('characterId');

    if (battleId) {
      // Get single battle details
      let battle: Battle | null = null;
      
      try {
        battle = await kv.hgetall<Battle>(`battle:${battleId}`);
      } catch (kvError) {
        console.warn('KV database error on fetching battle, using mock database:', kvError);
        battle = mockBattleDb.get(battleId) || null;
      }

      if (!battle) {
        return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
      }

      return NextResponse.json({ battle });
    } else if (characterId) {
      // Get battles for a character
      let battleIds: string[] = [];
      
      try {
        const battleIdsResponse = await kv.smembers(`character:${characterId}:battles`);
        // Ensure battleIds is an array
        battleIds = Array.isArray(battleIdsResponse) ? battleIdsResponse : [battleIdsResponse].filter(Boolean);
      } catch (kvError) {
        console.warn('KV database error on fetching battle IDs, using mock database:', kvError);
        // Get from mock DB - this part might need more implementation
        battleIds = Array.from(mockBattleDb.entries())
          .filter(([_, battle]) => battle.character1 === characterId || battle.character2 === characterId)
          .map(([id, _]) => id);
      }

      if (!battleIds || battleIds.length === 0) {
        return NextResponse.json({ battles: [] });
      }

      // Fetch all battles in parallel
      const battles = await Promise.all(
        battleIds.map(async (id: string) => {
          let battle: Battle | null = null;
          
          try {
            battle = await kv.hgetall<Battle>(`battle:${id}`);
          } catch (kvError) {
            console.warn(`KV database error on fetching battle ${id}, using mock database:`, kvError);
            battle = mockBattleDb.get(id) || null;
          }
          
          return battle;
        })
      );

      return NextResponse.json({ battles: battles.filter((battle): battle is Battle => battle !== null) });
    } else {
      return NextResponse.json({ error: 'Battle ID or character ID is required' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching battle:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to get the time of the last battle for a character
async function getLastBattleTime(characterId: string): Promise<number | null> {
  try {
    let battleIds: string[] = [];
    
    try {
      const battleIdsResponse = await kv.smembers(`character:${characterId}:battles`);
      // Ensure battleIds is an array
      battleIds = Array.isArray(battleIdsResponse) ? battleIdsResponse : [battleIdsResponse].filter(Boolean);
    } catch (kvError) {
      console.warn('KV database error on fetching battle IDs for cooldown, using mock database:', kvError);
      battleIds = Array.from(mockBattleDb.entries())
        .filter(([_, battle]) => battle.character1 === characterId || battle.character2 === characterId)
        .map(([id, _]) => id);
    }

    if (!battleIds || battleIds.length === 0) {
      return null; // No previous battles
    }

    // Get timestamps of all battles
    const battles = await Promise.all(
      battleIds.map(async (id: string) => {
        let battle: Battle | null = null;
        
        try {
          battle = await kv.hgetall<Battle>(`battle:${id}`);
        } catch (kvError) {
          console.warn(`KV database error on fetching battle ${id} for cooldown, using mock database:`, kvError);
          battle = mockBattleDb.get(id) || null;
        }
        
        return battle;
      })
    );

    // Find the most recent battle timestamp
    const validBattles = battles.filter((battle): battle is Battle => battle !== null);
    if (validBattles.length === 0) return null;

    return Math.max(...validBattles.map(battle => battle.timestamp));
  } catch (error) {
    console.error('Error getting last battle time:', error);
    return null;
  }
}

// Helper function to find an opponent based on ELO score
async function findOpponent(userCharacter: Character): Promise<Character | null> {
  try {
    // ELO range to search (±100 initially, can be expanded if no opponent found)
    let eloRange = 100;
    let maxAttempts = 3;
    let attempt = 0;
    let opponentCharacter: Character | null = null;

    while (!opponentCharacter && attempt < maxAttempts) {
      // Find characters in ELO range
      const minElo = userCharacter.elo - eloRange;
      const maxElo = userCharacter.elo + eloRange;
      
      let matchingCharacters: Character[] = [];
      
      try {
        // Get characters from KV based on ELO range
        const rankedCharacterIds = await kv.zrangebyscore('characters:ranking', minElo, maxElo);
        
        if (rankedCharacterIds && rankedCharacterIds.length > 0) {
          // Fetch all potential opponents
          matchingCharacters = await Promise.all(
            rankedCharacterIds.map(async (id: string) => {
              if (id === userCharacter.id) return null; // Skip user's own character
              
              return await kv.hgetall<Character>(`character:${id}`);
            })
          );
          
          // Filter out null values
          matchingCharacters = matchingCharacters.filter((char): char is Character => 
            char !== null && char.id !== userCharacter.id && char.owner.toLowerCase() !== userCharacter.owner.toLowerCase()
          );
        }
      } catch (kvError) {
        console.warn('KV database error on finding opponents, using mock database:', kvError);
        
        // Fall back to mock database and filter by ELO
        matchingCharacters = Array.from(mockCharacterDb.values()).filter(char => 
          char.id !== userCharacter.id && 
          char.owner.toLowerCase() !== userCharacter.owner.toLowerCase() &&
          char.elo >= minElo && char.elo <= maxElo
        );
      }
      
      // If no matching characters found, try AI characters if available
      if (matchingCharacters.length === 0) {
        // Check if we have any seeded AI characters
        let aiChars: Character[] = [];
        
        try {
          const aiCharIds = await kv.smembers(`user:${AI_BASE_ADDRESS}:characters`);
          if (aiCharIds && aiCharIds.length > 0) {
            aiChars = await Promise.all(
              aiCharIds.map(async (id: string) => await kv.hgetall<Character>(`character:${id}`))
            );
            aiChars = aiChars.filter((char): char is Character => char !== null);
          }
        } catch (kvError) {
          console.warn('KV database error on finding AI opponents, using mock database:', kvError);
          
          // If no seeded AI characters, create one from the predefined list
          if (aiCharacters && aiCharacters.length > 0) {
            // Pick a random AI character from the predefined list
            const randomIndex = Math.floor(Math.random() * aiCharacters.length);
            const randomAiChar = aiCharacters[randomIndex];
            
            // Create a new AI character (this will be temporary and not saved)
            const tempAiChar: Character = {
              id: `ai_temp_${Date.now()}`,
              owner: AI_BASE_ADDRESS,
              name: randomAiChar.name,
              traits: randomAiChar.traits,
              elo: userCharacter.elo, // Match user's ELO for fair battle
              wins: randomAiChar.wins,
              losses: randomAiChar.losses,
              draws: randomAiChar.draws,
              createdAt: Date.now()
            };
            
            aiChars = [tempAiChar];
          }
        }
        
        if (aiChars.length > 0) {
          // Select a random AI character that's within ELO range
          const eligibleAiChars = aiChars.filter(char => 
            char.elo >= minElo && char.elo <= maxElo
          );
          
          if (eligibleAiChars.length > 0) {
            const randomIndex = Math.floor(Math.random() * eligibleAiChars.length);
            opponentCharacter = eligibleAiChars[randomIndex];
          } else if (aiChars.length > 0) {
            // If no AI character in ELO range, adjust an AI character's ELO
            const randomIndex = Math.floor(Math.random() * aiChars.length);
            opponentCharacter = { 
              ...aiChars[randomIndex],
              elo: userCharacter.elo // Adjust ELO to match user for a fair battle
            };
          }
        }
      } else {
        // Select random opponent from matching characters
        const randomIndex = Math.floor(Math.random() * matchingCharacters.length);
        opponentCharacter = matchingCharacters[randomIndex];
      }
      
      // If still no opponent, expand the ELO range and try again
      if (!opponentCharacter) {
        eloRange += 100;
        attempt++;
      }
    }

    // If no opponent found after all attempts, create a temporary AI opponent
    if (!opponentCharacter && aiCharacters && aiCharacters.length > 0) {
      const randomIndex = Math.floor(Math.random() * aiCharacters.length);
      const aiCharBase = aiCharacters[randomIndex];
      
      opponentCharacter = {
        id: `ai_temp_${Date.now()}`,
        owner: AI_BASE_ADDRESS,
        name: aiCharBase.name,
        traits: aiCharBase.traits,
        elo: userCharacter.elo, // Match user's ELO
        wins: aiCharBase.wins || 0,
        losses: aiCharBase.losses || 0,
        draws: aiCharBase.draws || 0,
        createdAt: Date.now()
      };
    }

    return opponentCharacter;
  } catch (error) {
    console.error('Error finding opponent:', error);
    return null;
  }
}

// Simple battle decision algorithm - for MVP only
// In production, you'd use a more sophisticated LLM-based approach
async function decideBattle(character1: Character, character2: Character): Promise<BattleResult> {
  try {
    // Random battle result for demo purposes
    const randomValue = Math.random();
    
    // Slightly favor the character with higher ELO (60/40 split)
    const character1WinChance = character1.elo > character2.elo ? 0.6 : 0.4;
    
    // 10% chance of a draw
    if (randomValue < 0.1) {
      return {
        winner: 'character1', // Doesn't matter, isDraw is true
        isDraw: true,
        explanation: `${character1.name}과(와) ${character2.name}의 대결은 막상막하였습니다. 두 캐릭터는 각자의 능력을 최대한 발휘했지만, 어느 쪽도 우위를 점하지 못했습니다. 결국 무승부로 결정되었습니다.`
      };
    }
    
    // Determine winner
    const character1Wins = randomValue < character1WinChance + 0.1; // Adjusted for 10% draw chance
    
    if (character1Wins) {
      return {
        winner: 'character1',
        isDraw: false,
        explanation: `${character1.name}이(가) ${character2.name}을(를) 상대로 승리했습니다! ${character1.name}의 ${getRandomTrait(character1.traits)}이(가) 결정적인 역할을 했습니다. ${character2.name}의 ${getRandomTrait(character2.traits)}에도 불구하고 이번 대결은 ${character1.name}의 승리로 끝났습니다.`
      };
    } else {
      return {
        winner: 'character2',
        isDraw: false,
        explanation: `${character2.name}이(가) ${character1.name}을(를) 상대로 승리했습니다! ${character2.name}의 ${getRandomTrait(character2.traits)}이(가) 결정적인 역할을 했습니다. ${character1.name}의 ${getRandomTrait(character1.traits)}에도 불구하고 이번 대결은 ${character2.name}의 승리로 끝났습니다.`
      };
    }
  } catch (error) {
    console.error('Error in battle decision:', error);
    
    // Fallback result
    return {
      winner: Math.random() < 0.5 ? 'character1' : 'character2',
      isDraw: false,
      explanation: '두 캐릭터 간의 대결이 벌어졌습니다. 치열한 전투 끝에 승자가 결정되었습니다.'
    };
  }
}

// Helper function to extract a random trait from a character's traits description
function getRandomTrait(traits: string): string {
  const traitsList = traits.split(/[,.;]/).filter(trait => trait.trim().length > 0);
  
  if (traitsList.length === 0) {
    return '능력';
  }
  
  const randomIndex = Math.floor(Math.random() * traitsList.length);
  return traitsList[randomIndex].trim();
}
