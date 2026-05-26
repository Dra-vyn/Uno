const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const Game = require("./game");

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {};
const TURN_DURATION_MS = 30000;

function makeRoomId() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getRoomView(room, playerId) {
  if (!room || !room.game) {
    return {
      roomId: room?.id,
      hostId: room?.hostId,
      hostName: room?.hostName,
      players: room?.players.map((player) => ({
        id: player.id,
        name: player.name,
        handSize: player.hand.length,
        connected: player.connected,
        uno: player.hand.length === 1,
      })) || [],
      started: false,
      statusMessage: room?.statusMessage || "Waiting for players",
      selfId: playerId,
    };
  }

  const view = room.game.getPlayerView(playerId);
  return {
    ...view,
    roomId: room.id,
    hostId: room.hostId,
    hostName: room.hostName,
    started: room.status === "playing",
    statusMessage: room.statusMessage,
    selfId: playerId,
    turnExpiresAt: room.turnExpiresAt || null,
  };
}

function broadcastRoom(room) {
  room.players.forEach((player) => {
    if (player.socketId) {
      const view = getRoomView(room, player.id);
      io.to(player.socketId).emit("state", view);
    }
  });
}

function clearTurnTimer(room) {
  if (room.turnTimer) {
    clearTimeout(room.turnTimer);
    room.turnTimer = null;
  }
}

function scheduleTurnTimer(room) {
  clearTurnTimer(room);
  room.turnExpiresAt = Date.now() + TURN_DURATION_MS;
  room.turnTimer = setTimeout(() => {
    handleTurnTimeout(room.id);
  }, TURN_DURATION_MS);
  broadcastRoom(room);
}

function handleTurnTimeout(roomId) {
  const room = rooms[roomId];
  if (!room || room.status !== "playing" || !room.game) {
    return;
  }

  const player = room.game.getActivePlayer();
  if (!player) {
    return;
  }

  const handBefore = player.hand.length;
  const timeoutResult = room.game.handleTimeout(player.id);
  room.statusMessage = timeoutResult.message;
  if (timeoutResult.winnerId) {
    room.status = "ended";
    clearTurnTimer(room);
  } else {
    scheduleTurnTimer(room);
  }

  broadcastRoom(room);
}

function joinRoom(socket, payload) {
  const name = payload.name?.trim() || "Player";
  let roomId = payload.roomId?.trim()?.toUpperCase();
  const reconnectId = payload.playerId;

  if (!roomId) {
    roomId = makeRoomId();
  }

  let room = rooms[roomId];
  if (!room) {
    room = {
      id: roomId,
      hostId: null,
      hostName: null,
      players: [],
      status: "waiting",
      statusMessage: "Waiting for players",
      game: null,
      turnTimer: null,
      turnExpiresAt: null,
    };
    rooms[roomId] = room;
  }

  let player = null;
  if (reconnectId) {
    player = room.players.find((p) => p.id === reconnectId);
  }

  if (player) {
    player.connected = true;
    player.socketId = socket.id;
    socket.data.playerId = player.id;
    socket.data.roomId = room.id;
    room.statusMessage = `${player.name} rejoined the room.`;
    if (!room.hostId) {
      room.hostId = player.id;
      room.hostName = player.name;
    }
    broadcastRoom(room);
    return;
  }

  if (room.status === "playing") {
    socket.emit("error", "Game already started; joining is not allowed.");
    return;
  }

  const playerId = `${roomId}-${Math.random().toString(36).slice(2, 8)}`;
  player = {
    id: playerId,
    name: name || `Player ${room.players.length + 1}`,
    hand: [],
    socketId: socket.id,
    connected: true,
  };
  socket.data.playerId = player.id;
  socket.data.roomId = room.id;

  room.players.push(player);
  if (!room.hostId) {
    room.hostId = player.id;
    room.hostName = player.name;
  }
  room.statusMessage = `${player.name} joined the room.`;
  broadcastRoom(room);
}

function handleDisconnect(socket) {
  const roomId = socket.data.roomId;
  const playerId = socket.data.playerId;
  if (!roomId || !playerId) {
    return;
  }

  const room = rooms[roomId];
  if (!room) {
    return;
  }

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.connected = false;
    room.statusMessage = `${player.name} disconnected.`;
  }

  broadcastRoom(room);
}

function handleStartGame(socket) {
  const roomId = socket.data.roomId;
  const playerId = socket.data.playerId;
  if (!roomId || !playerId) {
    socket.emit("error", "You are not in a room.");
    return;
  }

  const room = rooms[roomId];
  if (!room || room.hostId !== playerId) {
    socket.emit("error", "Only the room host can start the game.");
    return;
  }

  if (room.players.length < 2) {
    socket.emit("error", "A minimum of 2 players is required to start.");
    return;
  }

  room.game = new Game(
    room.players.map((player) => ({ id: player.id, name: player.name })),
    roomId,
  );
  room.game.start();
  room.status = "playing";
  room.statusMessage = "Game started. Good luck!";
  scheduleTurnTimer(room);
  broadcastRoom(room);
}

function handlePlayCard(socket, payload) {
  const roomId = socket.data.roomId;
  const playerId = socket.data.playerId;
  if (!roomId || !playerId) {
    socket.emit("error", "You are not in a room.");
    return;
  }

  const room = rooms[roomId];
  if (!room || room.status !== "playing" || !room.game) {
    socket.emit("error", "The game is not active.");
    return;
  }

  const result = room.game.playCard(
    playerId,
    payload.cardId,
    payload.chosenColor,
  );
  if (!result.success) {
    socket.emit("error", result.message);
    return;
  }

  room.statusMessage = result.message;
  if (result.winnerId) {
    room.status = "ended";
    clearTurnTimer(room);
  } else {
    scheduleTurnTimer(room);
  }
  broadcastRoom(room);
}

function handleDrawCard(socket) {
  const roomId = socket.data.roomId;
  const playerId = socket.data.playerId;
  if (!roomId || !playerId) {
    socket.emit("error", "You are not in a room.");
    return;
  }

  const room = rooms[roomId];
  if (!room || room.status !== "playing" || !room.game) {
    socket.emit("error", "The game is not active.");
    return;
  }

  const result = room.game.playerDraw(playerId);
  if (!result.success) {
    socket.emit("error", result.message);
    return;
  }

  room.statusMessage = result.message;
  if (result.winnerId) {
    room.status = "ended";
    clearTurnTimer(room);
  } else if (result.turnEnded) {
    scheduleTurnTimer(room);
  }
  broadcastRoom(room);
}

io.on("connection", (socket) => {
  socket.on("joinRoom", (payload) => {
    joinRoom(socket, payload || {});
  });

  socket.on("startGame", () => {
    handleStartGame(socket);
  });

  socket.on("playCard", (payload) => {
    handlePlayCard(socket, payload || {});
  });

  socket.on("drawCard", () => {
    handleDrawCard(socket);
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Uno server running on http://localhost:${PORT}`);
});
