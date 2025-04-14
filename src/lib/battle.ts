import axios from 'axios';

interface Character {
  id: string;
  name: string;
  traits: string;
  elo: number;
  [key: string]: any;
}

interface BattleResult {
  winner: 'character1' | 'character2';
  isDraw: boolean;
  explanation: string;
}

// Function to decide battle winner using Gemini LLM
export async function decideBattleWinner(
  character1: Character,
  character2: Character
): Promise<BattleResult> {
  // Get Gemini API key from environment variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL_NAME = 'gemini-1.5-pro-latest';
  
  if (!GEMINI_API_KEY) {
    console.warn('Gemini API key not provided or invalid. Using fallback logic.');
    return fallbackDecision(character1, character2);
  }
  
  try {
    // Get character information
    const name1 = character1.name;
    const traits1 = character1.traits;
    const name2 = character2.name;
    const traits2 = character2.traits;
    
    // Calculate ELO probability
    const elo1 = character1.elo;
    const elo2 = character2.elo;
    const eloDiff = elo1 - elo2;
    const eloProbability = 1 / (1 + Math.pow(10, -eloDiff / 400));
    
    // Construct prompt for Gemini API
    const prompt = `
    You are the judge of a character battle game.
    Your task is to analyze the special abilities of two characters, determine a winner, and provide a creative narrative explaining the battle outcome.
    Your response should be in JSON format with 'winner' and 'narrative' fields.
    For 'winner', use 'character1', 'character2', or 'draw'.
    For 'narrative', provide a detailed description of how the battle unfolded and why the winner prevailed.
    
    Here's the information about the characters:
    
    Character 1: ${name1}
    Traits: ${traits1}
    ELO Score: ${elo1}
    
    Character 2: ${name2}
    Traits: ${traits2}
    ELO Score: ${elo2}
    
    Based on ELO scores, Character 1 has a ${(eloProbability * 100).toFixed(2)}% chance of winning.
    
    Consider creative interactions between abilities, strengths, and weaknesses to determine the battle outcome and explain why.
    Your result must be returned in the following JSON format:
    {
      "winner": "character1", // or "character2" or "draw"
      "narrative": "A detailed story explaining the battle process",
      "isDraw": boolean // true if it's a draw, false otherwise
    }
    `;
    
    // Gemini API request URL
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Configure the API request
    const requestData = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 50,
        maxOutputTokens: 500
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    };
    
    // Call Gemini API
    const response = await axios.post(apiUrl, requestData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Process API response
    if (response.data.candidates && response.data.candidates.length > 0) {
      const candidate = response.data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const responseText = candidate.content.parts[0].text;
        try {
          // Parse the LLM response as JSON
          const resultJson = JSON.parse(responseText.trim());
          
          // Verify required fields exist
          if (resultJson.winner && resultJson.narrative) {
            // Add isDraw field if it doesn't exist
            if (resultJson.isDraw === undefined) {
              resultJson.isDraw = resultJson.winner === 'draw';
            }
            
            // If winner is 'draw', normalize it
            if (resultJson.winner === 'draw') {
              resultJson.winner = Math.random() < 0.5 ? 'character1' : 'character2';
              resultJson.isDraw = true;
            }
            
            return {
              winner: resultJson.winner,
              isDraw: resultJson.isDraw,
              explanation: resultJson.narrative
            };
          } else {
            console.error('API response JSON missing required fields (winner, narrative):', responseText);
            return fallbackDecision(character1, character2);
          }
        } catch (parseError) {
          console.error('Failed to parse API response as JSON:', parseError);
          console.error('Received text:', responseText);
          return fallbackDecision(character1, character2);
        }
      } else {
        // No content (potentially blocked by safety settings)
        console.warn('No content in API response. Check safety settings or prompt.');
        console.warn('Block reason:', candidate.finishReason, candidate.safetyRatings);
        return fallbackDecision(character1, character2);
      }
    } else {
      // No candidates in response (unlikely but possible)
      console.error('No valid candidates in API response:', response.data);
      return fallbackDecision(character1, character2);
    }
  } catch (error) {
    console.error('Error during LLM API call:', error.response ? error.response.data : error.message);
    return fallbackDecision(character1, character2);
  }
}

// Fallback decision function for when API fails
function fallbackDecision(character1: Character, character2: Character): BattleResult {
  console.log('Using fallback battle decision logic.');
  
  // Determine winner based on ELO with some randomness
  const eloDiff = character1.elo - character2.elo;
  const eloProbability = 1 / (1 + Math.pow(10, -eloDiff / 400));
  const random = Math.random();
  
  // 15% chance of a draw
  const isDraw = random > 0.85;
  
  // Determine winner based on ELO probability if not a draw
  let winner: 'character1' | 'character2';
  let explanation: string;
  
  if (isDraw) {
    winner = Math.random() < 0.5 ? 'character1' : 'character2'; // Doesn't matter for a draw
    explanation = `The battle between ${character1.name} and ${character2.name} ended in a draw. Both characters demonstrated exceptional abilities: ${character1.name} with ${character1.traits}, and ${character2.name} with ${character2.traits}. Neither could gain a decisive advantage.`;
  } else {
    winner = random < eloProbability ? 'character1' : 'character2';
    const winnerChar = winner === 'character1' ? character1 : character2;
    const loserChar = winner === 'character1' ? character2 : character1;
    
    explanation = `${winnerChar.name} emerged victorious against ${loserChar.name}. Using ${winnerChar.traits}, ${winnerChar.name} was able to overcome ${loserChar.name}'s ${loserChar.traits} and secure a win.`;
  }
  
  return {
    winner,
    isDraw,
    explanation
  };
}

// Mock version for testing without API calls
export function mockBattleDecision(character1: Character, character2: Character): BattleResult {
  const random = Math.random();
  const isDraw = random > 0.8; // 20% chance of draw
  
  if (isDraw) {
    return {
      winner: Math.random() < 0.5 ? 'character1' : 'character2', // Technically doesn't matter in a draw
      isDraw: true,
      explanation: `Both ${character1.name} and ${character2.name} were evenly matched, resulting in a draw.`,
    };
  }
  
  const winner = random < 0.5 ? 'character1' : 'character2';
  const winnerChar = winner === 'character1' ? character1 : character2;
  const loserChar = winner === 'character1' ? character2 : character1;
  
  return {
    winner,
    isDraw: false,
    explanation: `${winnerChar.name} defeated ${loserChar.name} using their superior traits: ${winnerChar.traits}`,
  };
}
