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
- Vercel account (for production)
- OpenAI API key (for battle decisions)
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
```bash
# Copy the example environment file
cp .env.local.example .env.local

# Edit the file with your specific settings if needed
# For local development without KV database, you can keep the default settings
```

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Development Mode

The application includes a development mode that:

1. Uses a mock in-memory database when Vercel KV is not available
2. Reduces signature requests with caching
3. Provides development-only authentication options

To enable these features, make sure these settings are enabled in your `.env.local`:

```
NEXT_PUBLIC_USE_DEV_AUTH=true
NEXT_PUBLIC_BYPASS_AUTH=true
NEXT_PUBLIC_USE_MOCK_DB=true
```

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
  /providers - React context providers
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

## Troubleshooting

- **Database Connection Issues**: In development mode, the app will fall back to an in-memory mock database when Vercel KV is not available.
- **Auth Token Issues**: In development mode, you can enable `NEXT_PUBLIC_USE_DEV_AUTH=true` to reduce signature requests and streamline testing.
- **Multiple Signature Requests**: The app now includes auth token caching to prevent excessive signature requests.

## License

MIT
