import axios from 'axios';
import { Character, BattleResult } from '@/types';

// Function to decide battle winner using Gemini LLM
export async function decideBattleWinner(
  character1: Character,
  character2: Character
): Promise<BattleResult> {
  // Get Gemini API key from environment variables
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const GEMINI_MODEL_NAME = 'gemini-1.5-flash';

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
    const elo1 = typeof character1.elo === 'number' ? character1.elo : parseInt(character1.elo as unknown as string);
    const elo2 = typeof character2.elo === 'number' ? character2.elo : parseInt(character2.elo as unknown as string);
    const eloDiff = elo1 - elo2;
    const eloProbability = 1 / (1 + Math.pow(10, -eloDiff / 1500));

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

    **Important Rule:**
    - You never mention the ELO score in your response.
    - ELO score is only a reference.
    - Use the ELO win probability as a reference when the characters are evenly matched.
    - However, if the traits and abilities clearly create a decisive advantage for one character, you may override the ELO score and declare the winner based on abilities.
    - Focus on how abilities interact, counter, or synergize.

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
          // --- 수정 시작 ---
          // Markdown 코드 블록 제거 (```json ... ```)
          const cleanedText = responseText.trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
          // --- 수정 끝 ---

          // Parse the cleaned LLM response as JSON
          // const resultJson = JSON.parse(responseText.trim()); // 기존 코드
          const resultJson = JSON.parse(cleanedText); // 수정된 코드: 정리된 텍스트 파싱

          // Verify required fields exist
          if (resultJson.winner && resultJson.narrative) {
            // Add isDraw field if it doesn't exist
            if (resultJson.isDraw === undefined) {
              resultJson.isDraw = resultJson.winner === 'draw';
            }

            // If winner is 'draw', normalize it (이 부분은 그대로 유지)
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
            console.error('API response JSON missing required fields (winner, narrative):', cleanedText); // 로그에 정리된 텍스트 출력
            return fallbackDecision(character1, character2);
          }
        } catch (parseError) {
          console.error('Failed to parse API response as JSON:', parseError);
          console.error('Received cleaned text:', responseText.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); // 로그에 정리된 텍스트 출력
          console.error('Original received text:', responseText); // 원본 텍스트도 로깅
          return fallbackDecision(character1, character2);
        }
      } else {
        // No content (potentially blocked by safety settings)
        console.warn('No content in API response. Check safety settings or prompt.');
        if (candidate.finishReason) console.warn('Block reason:', candidate.finishReason);
        if (candidate.safetyRatings) console.warn('Safety ratings:', candidate.safetyRatings);
        return fallbackDecision(character1, character2);
      }
    } else {
      // No candidates in response (unlikely but possible)
      console.error('No valid candidates in API response:', response.data);
      return fallbackDecision(character1, character2);
    }
  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = String(error);
    }

    console.error('Error during LLM API call:', errorMessage);
    return fallbackDecision(character1, character2);
  }
}

// Fallback decision function for when API fails
function fallbackDecision(character1: Character, character2: Character): BattleResult {
  console.log('Using fallback battle decision logic.');

  // Determine winner based on ELO with some randomness
  const elo1 = typeof character1.elo === 'number' ? character1.elo : parseInt(character1.elo as unknown as string);
  const elo2 = typeof character2.elo === 'number' ? character2.elo : parseInt(character2.elo as unknown as string);
  const eloDiff = elo1 - elo2;
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
