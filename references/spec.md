# Uno Multiplayer Web Game - Requirements Report

## Overview

Uno is a web-based real-time multiplayer card game supporting 2–6 players.

The objective of the game is:
- Be the first player to empty all cards from their hand.

---

# Core Gameplay Rules

## Players
- Minimum players: 2
- Maximum players: 6

## Starting Cards
- Each player starts with 7 cards.

## Turn System
- Real-time gameplay
- Each player has a 30-second turn timer.

### Turn Timeout Behavior
When the timer expires:
1. A card is automatically drawn for the player.
2. If the drawn card is playable, it is automatically played immediately.
3. Otherwise, the turn ends.

---

# Card Types

## Number Cards
For each color:
- Red
- Yellow
- Blue
- Green

Number cards:
- 1–9

---

# Action Cards

The game includes:
- Reverse
- Skip
- +1
- +2
- +4
- Wild Card

---

# Action Card Rules

## Reverse Card
- Reverses play direction.
- In a 2-player game, reverse only changes direction and does NOT act as a skip.

## Wild Card
- Player can manually choose the next color.

---

# Draw Card Stacking Rules

Stacking is enabled.

Examples:
- `+2` can stack on `+2`
- `+4` can stack on `+2`
- `+2` can't stack on `+4`

## Stacking Behavior
- Stacking can continue indefinitely.
- No stack limit exists.

Example:
`+2 → +2 → +4 → +4 → ...`

---

# UNO Callout Rules

- Automatically call UNO when they have one card remaining.


---

# Match Structure

## Match Type
- Single-round matches only.
- No score tracking between rounds.

## Winning Condition
- First player with zero cards wins the game.

---

# Lobby & Room System

## Room Type
- Public rooms only.

## Joining Rules
- Players may join only before the game starts.
- Joining after match start is not allowed.

## Host Rules
- The first player joining the room becomes the host.

### Host Permissions
Host can:
- Start the game

## Game Start Rules
- Host manually starts the game.
- Minimum 2 players required before starting.

---

# Player Connectivity

## Reconnection Support
Players can reconnect if:
- They refresh the page

The game state should persist during reconnection.

---

# Turn Order

## Starting Player
- Randomly selected at game start.

---

# Deck Rules

## Empty Draw Pile
When the draw pile becomes empty:
- Discarded cards are reshuffled into a new draw pile.

---

# Features Not Included

The following features are intentionally excluded:

## Chat System
- No player chat
- No emotes

## Spectator Mode
- Spectators/watchers are not allowed

## Ranked Mode
- No ranked matchmaking

## Multi-Round Matches
- No score persistence

---

## Gameplay UX
- Animated card transitions
- Turn timer progress indicator
- Highlight playable cards


## Lobby Improvements
- Room list with active player count
- Ready status indicator
- Auto-remove inactive rooms

## Architecture:
- Frontend: React
- Backend: Node.js + WebSockets
- Real-time communication: Socket.IO or native WebSocket

---