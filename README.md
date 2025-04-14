# Text Battle Game

A web3-based text battle game where characters fight based on their traits using LLM decision making.

## Features

1. Web3 wallet authentication (RainbowKit, MetaMask, WalletConnect, etc.)
2. Create up to 5 characters per user with name, traits, ELO score, and ranking
3. Battle system that matches characters based on ELO score
4. Battles are decided by an LLM based on character traits
5. Character stats and battle history tracking
6. 3-minute cooldown between battles

## Tech Stack

- Next.js
- Web3 Authentication (RainbowKit, wagmi, viem, ethers)
- Vercel KV for database
- OpenAI API for battle decisions
- TailwindCSS for styling

## Getting Started

### Prerequisites

- Node.js 16.8 or later
- Vercel account
- OpenAI API key
- WalletConnect Project ID (for wallet connection)

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
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

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
    /account - Account page
    /battle - Battle page
    /character - Character details
    /ranking - Ranking page
  /components - React components
  /background - Background processes and providers
  /common - Common utilities and configuration
    /atoms - State management with Jotai
  /lib - Utility functions
  /hooks - Custom React hooks
```

## API Routes

- `/api/user` - User management
- `/api/character` - Character management
- `/api/battle` - Battle system
- `/api/ranking` - Ranking system

## Wallet Connection

The app uses RainbowKit for a user-friendly wallet connection experience, supporting:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Phantom Wallet
- And more...

## License

MIT
