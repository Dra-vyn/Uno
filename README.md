# Uno Multiplayer Web Game

A first-cut real-time Uno game with a React frontend and Node.js + Socket.IO backend.

## Setup

1. Install dependencies for server and client:

   ```bash
   npm run install-all
   ```

2. Start both apps:

   ```bash
   npm run dev
   ```

3. Open the client at `http://localhost:5173` and join the same room from a second browser tab.

## Notes

- The game supports a 2-player match for the initial implementation.
- The server enforces Uno rules, turn order, and draw stacking.
- A 30-second turn timer automatically resolves timeouts.
- The first player to empty their hand wins.
