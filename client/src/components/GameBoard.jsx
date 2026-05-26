import { useEffect, useMemo, useState } from "react";

function displayCard(card) {
  if (!card) {
    return "??";
  }
  return card.display;
}

function isCardPlayable(card, state) {
  if (!card || !state) {
    return false;
  }

  const top = state.topCard;
  if (!top) {
    return true;
  }

  if (state.stack) {
    if (state.stack.type === "plus2") {
      return card.type === "plus2" || card.type === "plus4";
    }
    if (state.stack.type === "plus4") {
      return card.type === "plus4";
    }
    return false;
  }

  if (card.type === "wild" || card.type === "plus4") {
    return true;
  }

  if (card.color === state.currentColor) {
    return true;
  }

  if (
    card.type === "number" &&
    top.type === "number" &&
    card.value === top.value
  ) {
    return true;
  }

  return card.type !== "number" && top.type === card.type;
}

export default function GameBoard({
  state,
  onCardClick,
  onDraw,
  onWildSelect,
  pendingWildCard,
}) {
  const [now, setNow] = useState(Date.now());
  const activePlayer = state.players.find(
    (player) => player.id === state.activePlayerId,
  );
  const self = state.players.find((player) => player.id === state.selfId);
  const opponent = state.players.find((player) => player.id !== state.selfId);
  const isYourTurn = state.selfId === state.activePlayerId && !state.winnerId;
  const isOpponentActive = opponent?.id === state.activePlayerId;

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(interval);
  }, []);

  const timerProgress = useMemo(() => {
    if (!state.turnExpiresAt) {
      return 0;
    }
    const remaining = Math.max(0, state.turnExpiresAt - now);
    return (remaining / 30000) * 100;
  }, [state.turnExpiresAt, now]);

  return (
    <div className="game-container">
      <aside className="sidebar">
        <div className="logo">UNO</div>
        <div className="room-info">
          <h3>Room: {state.roomId}</h3>
          <p>{state.statusMessage}</p>
        </div>
        <div className="divider" />
        <div className="players-title">Players ({state.players.length}/2)</div>
        <div className="player-item">
          <div className="player-left">
            <div className="avatar" />
            <span>
              {self?.name}
              {state.selfId === state.hostId ? " (Host)" : ""}
            </span>
          </div>
          <div
            className={`online-dot ${self?.connected ? "online" : "offline"}`}
          />
        </div>
        {opponent && (
          <div className="player-item">
            <div className="player-left">
              <div className="avatar" />
              <span>{opponent.name}</span>
            </div>
            <div
              className={`online-dot ${opponent.connected ? "online" : "offline"}`}
            />
          </div>
        )}
      </aside>

      <div className={`top-player ${isOpponentActive ? "active" : ""}`}>
        <div className="top-avatar" />
        <h2>{opponent?.name || "Waiting..."}</h2>
        <div className="opponent-cards">
          {Array.from({ length: opponent?.handSize || 0 }).map((_, index) => (
            <div key={index} className="op-card" />
          ))}
        </div>
      </div>

      <div className="table-area">
        <div className="center-circle">
          <div className="pile-container">
            <div className="deck" />
            <div className="discard">
              {state.topCard ? (
                <div className={`card discard-card ${state.topCard.color || state.topCard.type}`}>
                  <div className="corner top-left">
                    {state.topCard.type === "wild" || state.topCard.type === "plus4" ? (state.topCard.type === "plus4" ? "+4" : "W") : state.topCard.display}
                  </div>
                  {state.topCard.type === "number" ? (
                    <div className="number">{state.topCard.display}</div>
                  ) : state.topCard.type === "wild" || state.topCard.type === "plus4" ? (
                    <>
                      <div className="symbol">{state.topCard.type === "plus4" ? "+4" : "W"}</div>
                      <div className="corner bottom-right">{state.topCard.type === "plus4" ? "+4" : "W"}</div>
                    </>
                  ) : (
                    <>
                      <div className="symbol">{state.topCard.display}</div>
                      <div className="corner bottom-right">{state.topCard.display}</div>
                    </>
                  )}
                </div>
              ) : (
                "UNO"
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="turn-panel">
        <h2>Current Turn</h2>
        <div className="turn-player">{activePlayer?.name || "Waiting..."}</div>
        <div className="timer">
          {Math.max(
            0,
            Math.ceil(((state.turnExpiresAt || Date.now()) - now) / 1000),
          )}
        </div>
      </div>

      <div className={`bottom-section ${isYourTurn ? "active" : ""}`}>
        <div className="your-info">
          <h2>
            {self?.name || "You"}
            {state.selfId === state.hostId ? " (Host)" : ""}
          </h2>
        </div>

        <div className="your-hand">
          {state.hand.map((card) => {
            const playable = isCardPlayable(card, state);
            const isNumber = card.type === "number";
            const isWild = card.type === "wild" || card.type === "plus4";
            return (
              <button
                key={card.id}
                className={`card ${card.color || card.type} ${playable ? "playable" : ""}`}
                onClick={() => onCardClick(card)}
                disabled={!isYourTurn || !playable || !!state.winnerId}
              >
                <div className="corner top-left">
                  {isWild ? (card.type === "plus4" ? "+4" : "W") : card.display}
                </div>
                {isNumber ? (
                  <div className="number">{card.display}</div>
                ) : isWild ? (
                  <>
                    <div className="wild-grid">
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <div className="corner bottom-right">
                      {card.type === "plus4" ? "+4" : "W"}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="symbol">{card.display}</div>
                    <div className="corner bottom-right">{card.display}</div>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="actions">
          <button
            className="action-btn draw-btn"
            onClick={onDraw}
            disabled={!isYourTurn || !!state.winnerId}
          >
            Draw Card
          </button>
        </div>
      </div>

      {pendingWildCard && (
        <div className="overlay">
          <div className="modal">
            <h3>Choose a color</h3>
            <div className="color-grid">
              {["red", "yellow", "green", "blue"].map((color) => (
                <button
                  key={color}
                  className={`color-button ${color}`}
                  onClick={() => onWildSelect(color)}
                >
                  {color}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
