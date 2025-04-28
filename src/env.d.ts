// src/env.d.ts

// TypeScript에서 환경 변수에 대한 타입 정의
declare namespace NodeJS {
  interface ProcessEnv {
    // API 키
    OPENAI_API_KEY?: string;
    
    // Discord 관련 설정
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    DISCORD_REDIRECT_URI?: string;
    DISCORD_GUILD_ID?: string;
    
    // 프론트엔드 환경 변수 (클라이언트에서 접근 가능)
    NEXT_PUBLIC_DISCORD_CLIENT_ID?: string;
    NEXT_PUBLIC_DISCORD_REDIRECT_URI?: string;
    
    // Vercel KV 관련 설정
    KV_URL?: string;
    KV_REST_API_TOKEN?: string;
    KV_REST_API_READ_ONLY_TOKEN?: string;
    KV_REST_API_URL?: string;
    REDIS_URL?: string;
    
    // 개발 환경 설정
    NEXT_PUBLIC_USE_DEV_AUTH?: string;
    
    // Vercel 배포 URL
    VERCEL_URL?: string;
  }
}
