# Text Battle Game

A Discord-based text battle game where characters fight based on their traits using LLM decision making.

## Features

1. Discord authentication and role-based leagues
2. Create one character per user with name, traits, ELO score, and ranking
3. Battle system that matches characters based on ELO score
4. Battles are decided by an LLM based on character traits
5. Character stats and battle history tracking
6. 3-minute cooldown between battles
7. Character prompt updates (once per 12 hours)

## Tech Stack

- Next.js
- Discord OAuth2 Authentication
- Vercel KV for database
- OpenAI API for battle decisions
- TailwindCSS for styling

## Getting Started

### Prerequisites

- Node.js 16.8 or later
- Vercel account
- OpenAI API key
- Discord Developer Application

### Local Development

1. Clone the repository
```bash
git clone https://github.com/sgh94/text-battle-game.git
cd text-battle-game
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env.local` file with the required environment variables:
```
KV_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_read_only_token
KV_REST_API_URL=your_kv_api_url
REDIS_URL=your_redis_url
OPENAI_API_KEY=your_openai_api_key

# Discord OAuth Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=your_redirect_uri
DISCORD_GUILD_ID=your_discord_guild_id
NEXT_PUBLIC_DISCORD_CLIENT_ID=your_discord_client_id
NEXT_PUBLIC_DISCORD_REDIRECT_URI=your_redirect_uri
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Discord Setup

1. Create a new application in the [Discord Developer Portal](https://discord.com/developers/applications)
2. Set up OAuth2 with the following redirect URI: `http://localhost:3000/auth/callback` (for local development)
3. Add a bot to your application
4. Invite the bot to your Discord server
5. Copy the Client ID, Client Secret, and Guild ID (Server ID) to your environment variables

### Deployment

This application is configured for deployment on Vercel:

1. Push your code to a GitHub repository
2. Import the project in Vercel
3. Configure the environment variables in the Vercel dashboard
4. Deploy

## Project Structure

```
/src
  /app - Next.js app router
    /api - API routes
      /discord - Discord authentication endpoints
    /auth - Discord auth callback handler
    /account - Account page
    /battle - Battle page
    /character - Character details
    /ranking - Ranking page
  /components - React components
    /providers - Context providers
  /hooks - Custom React hooks
  /lib - Utility functions
  /services - Service functions
  /types - TypeScript definitions
```

## API Routes

- `/api/discord/auth` - Discord authentication
- `/api/discord/refresh-roles` - Refresh Discord roles
- `/api/user` - User management
- `/api/character` - Character management
- `/api/battle` - Battle system
- `/api/ranking` - Ranking system

## Discord Authentication

The app uses Discord OAuth2 for authentication and role management, supporting:
- Discord account login
- Role-based league assignment
- Automatic role updates

## League System

The game features multiple leagues based on Discord roles:
- Bronze League - Default league for all players
- Silver League - For players with proven skills
- Gold League - For experienced players
- Platinum League - The elite league for top players

Players can belong to multiple leagues based on their Discord roles, but compete primarily in their highest tier league.

## License

MIT
