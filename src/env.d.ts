// src/env.d.ts

// Type definitions for environment variables in TypeScript
declare namespace NodeJS {
  interface ProcessEnv {
    // API keys
    OPENAI_API_KEY?: string;

    // Discord related settings
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    DISCORD_REDIRECT_URI?: string;
    DISCORD_GUILD_ID?: string;

    // Frontend environment variables (accessible from client)
    NEXT_PUBLIC_DISCORD_CLIENT_ID?: string;
    NEXT_PUBLIC_DISCORD_REDIRECT_URI?: string;

    // Vercel KV related settings
    KV_URL?: string;
    KV_REST_API_TOKEN?: string;
    KV_REST_API_READ_ONLY_TOKEN?: string;
    KV_REST_API_URL?: string;
    REDIS_URL?: string;

    // Development environment settings
    NEXT_PUBLIC_USE_DEV_AUTH?: string;

    // Vercel deployment URL
    VERCEL_URL?: string;
  }
}
