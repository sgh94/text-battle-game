/**
 * PKCE (Proof Key for Code Exchange) 유틸리티 함수
 * 
 * 이 모듈은 OAuth 2.0 인증을 위한 PKCE 챌린지 생성에 필요한 유틸리티를 제공합니다.
 * Web API만 사용하여 Edge Runtime과 호환됩니다.
 */

/**
 * 지정된 길이의 랜덤 문자열 생성
 */
export function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  
  // Web Crypto API 사용 (Edge Runtime 호환)
  self.crypto.getRandomValues(values);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    result += possible.charAt(values[i] % possible.length);
  }
  
  return result;
}

/**
 * 문자열을 UTF-8 버퍼로 변환
 */
function stringToBuffer(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * BASE64URL 인코딩
 * (URL 및 파일명 안전 BASE64 인코딩)
 */
function base64URLEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * SHA-256 해시 생성 (Web Crypto API 사용)
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest('SHA-256', data);
}

/**
 * PKCE 코드 챌린지 생성
 * 코드 검증기를 기반으로 S256 코드 챌린지 생성
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  try {
    const hashed = await sha256(codeVerifier);
    return base64URLEncode(hashed);
  } catch (error) {
    console.error('Error generating code challenge:', error);
    throw new Error('Failed to generate code challenge');
  }
}
