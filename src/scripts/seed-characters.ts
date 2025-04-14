/**
 * 기본 AI 캐릭터 시드 스크립트
 * 
 * 사용 방법:
 * 1. npm run dev 서버 실행
 * 2. 별도 터미널에서 다음 명령어 실행:
 *    npx ts-node -r tsconfig-paths/register src/scripts/seed-characters.ts
 */

import { Character } from '../types';

// AI 캐릭터 베이스 주소 (가상 주소, 실제 지갑은 아님)
const AI_BASE_ADDRESS = '0xAI00000000000000000000000000000000000000';

// 기본 AI 캐릭터 목록
const aiCharacters: Omit<Character, 'id' | 'createdAt'>[] = [
  {
    owner: AI_BASE_ADDRESS,
    name: '강철의 기사',
    traits: '무적의 방어력을 가진 중장 기사. 쇠로 만든 완전 갑옷을 입고 거대한 방패를 든다. 타격에 매우 강하지만 속도가 느리고 마법에 약하다.',
    elo: 1200,
    wins: 54,
    losses: 21,
    draws: 5
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '그림자 암살자',
    traits: '어둠 속에서 숨어다니는 암살자. 빠른 단검과 독을 사용한다. 순간 이동 능력이 있어 포착하기 어렵다. 직접적인 전투에는 약하나 기습에 능하다.',
    elo: 1250,
    wins: 67,
    losses: 31,
    draws: 2
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '불꽃 마법사',
    traits: '화염을 다루는 강력한 마법사. 화염구, 화염 폭풍, 용암 파도 등 다양한 화염 계열 마법을 사용한다. 공격력은 매우 강하지만 방어력이 약하다.',
    elo: 1350,
    wins: 89,
    losses: 23,
    draws: 8
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '얼음 여왕',
    traits: '얼음과 눈을 자유자재로 다루는 마법사. 적을 얼려버리고 얼음 무기를 창조한다. 차가운 성격과 냉철한 판단력으로 전투를 지휘하는 재능이 있다.',
    elo: 1280,
    wins: 72,
    losses: 28,
    draws: 10
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '자연의 수호자',
    traits: '자연의 힘을 이용하는 드루이드. 동물로 변신하거나 식물을 조종하는 능력이 있다. 치유 능력이 뛰어나고 주변 환경을 이용한 전투에 능하다.',
    elo: 1150,
    wins: 47,
    losses: 39,
    draws: 14
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '기계 병사',
    traits: '최첨단 기술로 만들어진 반인반기계 전사. 내장된 다양한 무기와 도구를 사용한다. 분석력이 뛰어나고 전략적인 전투를 선호한다.',
    elo: 1320,
    wins: 82,
    losses: 27,
    draws: 5
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '천상의 성기사',
    traits: '신성한 빛의 힘을 사용하는 성기사. 악을 물리치고 약자를 보호하는 것이 사명이다. 신성 마법으로 치유와 보호를 할 수 있으며 언데드에게 특히 강하다.',
    elo: 1400,
    wins: 95,
    losses: 20,
    draws: 5
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '혼돈의 마녀',
    traits: '현실을 왜곡하고 환각을 만들어내는 마녀. 적의 마음을 읽고 공포를 유발할 수 있다. 직접적인 공격보다는 정신적 교란 전술을 선호한다.',
    elo: 1300,
    wins: 78,
    losses: 32,
    draws: 10
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '황야의 유랑자',
    traits: '광활한 사막과 황무지를 떠돌아다니는 건슬링거. 정확한 사격 실력과 생존 기술을 갖추고 있다. 함정과 매복에 능하며 자신만의 방식으로 싸운다.',
    elo: 1180,
    wins: 51,
    losses: 38,
    draws: 11
  },
  {
    owner: AI_BASE_ADDRESS,
    name: '심해의 지배자',
    traits: '깊은 바다에서 온 신비로운 존재. 물을 조종하고 해양 생물을 부리는 능력이 있다. 물속에서는 무적에 가까운 힘을 발휘하지만 육지에서는 약해진다.',
    elo: 1220,
    wins: 63,
    losses: 37,
    draws: 7
  }
];

/**
 * AI 캐릭터를 데이터베이스에 추가하는 함수
 */
async function seedAICharacters() {
  try {
    console.log('AI 캐릭터 시드 프로세스 시작...');

    // 서버에 요청할 기본 URL
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';

    // 가상의 서명 생성 (개발용 - 실제로는 검증 안 함)
    const timestamp = Date.now();
    const message = `Seed AI Characters: ${timestamp}`;
    const mockSignature = '0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

    // 관리자 계정 생성 (AI 캐릭터를 관리할 가상 계정)
    console.log('AI 관리자 계정 등록 중...');
    await fetch(`${baseUrl}/api/user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        address: AI_BASE_ADDRESS,
        message,
        signature: mockSignature
      })
    });

    // 각 AI 캐릭터 추가
    console.log('AI 캐릭터 생성 중...');
    for (const character of aiCharacters) {
      // 캐릭터 생성 시간을 랜덤하게 설정 (최근 1년 내)
      const randomDaysAgo = Math.floor(Math.random() * 365);
      const createdAt = Date.now() - (randomDaysAgo * 24 * 60 * 60 * 1000);

      // 캐릭터 ID 생성
      const characterId = `${AI_BASE_ADDRESS}_${createdAt}`;

      // 캐릭터 객체 완성
      const completeCharacter: Character = {
        ...character,
        id: characterId,
        createdAt
      } as Character;

      // API 엔드포인트에 직접 접근 (개발용으로만 사용)
      // 실제 프로덕션에서는 시드 스크립트가 더 안전한 방법으로 구현되어야 함
      console.log(`캐릭터 생성 중: ${completeCharacter.name}`);

      // 인증 헤더 생성 (개발용 - 실제로는 검증 안 함)
      const authHeader = `Bearer ${AI_BASE_ADDRESS}:${timestamp}:${mockSignature}`;

      // 캐릭터 API 호출
      const response = await fetch(`${baseUrl}/api/character/seed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(completeCharacter)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`캐릭터 생성 실패: ${completeCharacter.name}`, error);
      } else {
        console.log(`캐릭터 생성 성공: ${completeCharacter.name}`);
      }
    }

    console.log('AI 캐릭터 시드 프로세스 완료!');
  } catch (error) {
    console.error('시드 프로세스 중 오류 발생:', error);
  }
}

// 스크립트가 직접 실행될 때 시드 함수 호출
if (require.main === module) {
  seedAICharacters();
}

export { aiCharacters, seedAICharacters };
