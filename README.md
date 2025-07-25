# OM2048
![banner](https://raw.githubusercontent.com/Luca1905/OM2048/refs/heads/main/public/Screenshot%202025-07-11%20at%2016.12.22.png)


OM2048 is a multiplayer version of the classic 2048 game. There is one single canvas with 10.000 games, where all players can make moves that are shared with everyone.


## Tech Stack

- Frontend: React 19, Vite
- Backend: Express.js, Socket.IO
- Database: Redis
- Language: TypeScript
- Package Manager: Bun

## Prerequisites

- [Bun](https://bun.sh/) (v1.0.0 or higher)
- [Redis](https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/) (v5.0 or higher)
- Node.js (v18 or higher)

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Luca1905/OM2048
   cd OM2048
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   cp .env.example .env
   ```

4. Start Redis server:
   ```bash
   redis-server
   ```

5. Start the development servers:

   In one terminal, start the backend:
   ```bash
   bun run dev:backend
   ```

   In another terminal, start the frontend:
   ```bash
   bun run dev:frontend
   ```

6. Open your browser and navigate to `http://localhost:5173`

## Development

- `bun run dev:frontend` - Start frontend development server
- `bun run dev:backend` - Start backend development server
- `bun run typecheck` - Run TypeScript type checking
- `bun run check` - Run Biome linter
- `bun run check:write` - Run Biome linter and fix issues

## Project Structure

```
OM2048/
├── src/
│   ├── client/     # Frontend React application
│   ├── server/     # Backend Express server
│   └── shared/     # Shared files
├── public/         # Static assets
```
