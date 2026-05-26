import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import Lobby from "./components/Lobby";
import GameBoard from "./components/GameBoard";

const SERVER_URL = "http://localhost:4000";

function App() {
  const socket = useRef(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState(null);
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [pendingWildCard, setPendingWildCard] = useState(null);
  const [storedSession, setStoredSession] = useState(null);

  useEffect(() => {
    const storedRoomId = localStorage.getItem("uno-room-id");
    const storedPlayerId = localStorage.getItem("uno-player-id");
    if (storedRoomId && storedPlayerId) {
      setStoredSession({ roomId: storedRoomId, playerId: storedPlayerId });
    }

    socket.current = io(SERVER_URL, {
      transports: ["websocket"],
    });

    socket.current.on("connect", () => {
      setConnected(true);
    });

    socket.current.on("disconnect", () => {
      setConnected(false);
    });

    socket.current.on("state", (gameState) => {
      setState(gameState);
      if (gameState.roomId) {
        localStorage.setItem("uno-room-id", gameState.roomId);
      }
      if (gameState.selfId) {
        localStorage.setItem("uno-player-id", gameState.selfId);
      }
      setError("");
    });

    socket.current.on("error", (message) => {
      setError(message);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const isHost = useMemo(
    () => state?.selfId && state?.hostId === state.selfId,
    [state],
  );
  const isInLobby = useMemo(() => state && !state.started, [state]);
  const isInGame = useMemo(() => state && state.started, [state]);

  const handleJoin = () => {
    if (!socket.current) {
      return;
    }
    if (!name.trim()) {
      setError("Please enter a player name.");
      return;
    }
    setError("");
    socket.current.emit("joinRoom", {
      roomId: roomId.trim(),
      name: name.trim(),
    });
  };

  const handleRestore = () => {
    if (!socket.current || !storedSession) {
      return;
    }
    setError("");
    socket.current.emit("joinRoom", {
      roomId: storedSession.roomId,
      playerId: storedSession.playerId,
      name: name.trim() || "Player",
    });
  };

  const handleStart = () => {
    if (!socket.current) {
      return;
    }
    socket.current.emit("startGame");
  };

  const handlePlayCard = (cardId, chosenColor) => {
    if (!socket.current) {
      return;
    }
    socket.current.emit("playCard", { cardId, chosenColor });
    setPendingWildCard(null);
  };

  const handleDraw = () => {
    if (!socket.current) {
      return;
    }
    socket.current.emit("drawCard");
  };

  const handleWildSelect = (color) => {
    if (!pendingWildCard) {
      return;
    }
    handlePlayCard(pendingWildCard.id, color);
  };

  const handleCardClick = (card) => {
    if (card.type === "wild" || card.type === "plus4") {
      setPendingWildCard(card);
      return;
    }
    handlePlayCard(card.id, null);
  };

  return (
    <div className="app-shell">
      <header>
        <h1>Uno Multiplayer</h1>
      </header>

      {!connected && <div className="alert">Connecting to game server...</div>}

      <main>
        {!state && (
          <div className="join-box">
            <div className="join-heading">
              <h2>Enter your name and room code</h2>
              <p>Leave room code empty to create a new game.</p>
            </div>
            <label>
              Player name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </label>
            <label>
              Room code
              <input
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Leave empty to create"
              />
            </label>
            <button
              className="join-btn"
              onClick={handleJoin}
              disabled={!connected || !name.trim()}
            >
              Join or Create Room
            </button>
            {storedSession && (
              <button
                className="restore-btn"
                onClick={handleRestore}
                disabled={!connected}
              >
                Restore previous game
              </button>
            )}
            {error && <div className="error">{error}</div>}
          </div>
        )}

        {state && isInLobby && (
          <Lobby
            roomId={state.roomId}
            players={state.players}
            hostId={state.hostId}
            selfId={state.selfId}
            statusMessage={state.statusMessage}
            canStart={isHost && state.players.length >= 2}
            onStart={handleStart}
            error={error}
          />
        )}

        {state && isInGame && (
          <GameBoard
            state={state}
            onCardClick={handleCardClick}
            onDraw={handleDraw}
            onWildSelect={handleWildSelect}
            pendingWildCard={pendingWildCard}
          />
        )}

        {error && state && <div className="error">{error}</div>}
      </main>
    </div>
  );
}

export default App;
