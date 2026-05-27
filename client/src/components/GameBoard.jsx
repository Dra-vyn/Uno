import { useEffect, useMemo, useState } from "react";

const CARD_SYMBOLS = {
  reverse: "↺",
  skip: "⊘",
  plus1: "+1",
  plus2: "+2",
  plus4: "+4",
  wild: "W",
};

function getCardSymbol(card) {
  if (!card) {
    return "??";
  }

  if (card.type === "number") {
    return card.display ?? card.value ?? "?";
  }

  return CARD_SYMBOLS[card.type] || card.display || "?";
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

function renderCardFace(card) {
  const symbol = getCardSymbol(card);
  const isNumber = card.type === "number";
  const isWild = card.type === "wild" || card.type === "plus4";

  return (
    <>
      <div className="corner top-left">{symbol}</div>
      {isNumber ? (
        <div className="number">{symbol}</div>
      ) : isWild ? (
        <>
          <div className="wild-grid">
            <div />
            <div />
            <div />
            <div />
          </div>
          <div className="corner bottom-right">{symbol}</div>
        </>
      ) : (
        <>
          <div className="symbol">{symbol}</div>
          <div className="corner bottom-right">{symbol}</div>
        </>
      )}
    </>
  );
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
  const opponentIsActive = opponent?.id === state.activePlayerId;
  const selfIsActive = state.selfId === state.activePlayerId;

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
    <main className="game">
      <div className="top-bar">
        <div className="room-info">
          <div className="room-title">Room {state.roomId}</div>
          <div className="muted">{state.statusMessage}</div>
        </div>
      </div>

      <div className="player">
        <div className="player-info">
          <div
            className={`avatar ${opponentIsActive ? "timer-avatar" : ""}`}
            style={opponentIsActive ? { "--timer-progress": `${timerProgress}%` } : undefined}
          >
            {opponent?.handSize ?? ""}
          </div>
          <div>
            <div className="player-name">{opponent?.name || "Waiting..."}</div>
            <div className="muted">
              {opponent ? `${opponent.handSize} cards` : "Waiting for opponent"}
            </div>
          </div>
          {opponentIsActive && <div className="turn-badge">TURN</div>}
        </div>

        <div className="opponent-stack">
          <div className="stack-card stack-card-1" />
          <div className="stack-card stack-card-2" />
          <div className="stack-card stack-card-3" />
          <div className="stack-count">{opponent?.handSize ?? 0}</div>
        </div>
      </div>

      <section className="center">
        <div className="deck" title="Click to draw" onClick={onDraw} />
        <div className="discard">
          {state.topCard ? (
            <div className={`card ${state.topCard.color || state.topCard.type}`}>
              {renderCardFace(state.topCard)}
            </div>
          ) : (
            <div className="discard-placeholder">UNO</div>
          )}
        </div>
      </section>

      <div className="bottom">
        <div className="your-info">
          <div
            className={`avatar ${selfIsActive ? "timer-avatar" : ""}`}
            style={selfIsActive ? { "--timer-progress": `${timerProgress}%` } : undefined}
          >
            {self?.handSize ?? ""}
          </div>
          <div>
            <div className="player-name">{self?.name || "You"}</div>
            <div className="muted">{self ? `${self.handSize} cards` : ""}</div>
          </div>
          {selfIsActive && <div className="turn-badge">TURN</div>}
        </div>

        <div className="hand">
          {state.hand.map((card) => {
            const playable = isCardPlayable(card, state);
            return (
              <button
                key={card.id}
                className={`card small ${card.color || card.type} ${playable ? "playable" : ""}`}
                onClick={() => onCardClick(card)}
                disabled={!isYourTurn || !playable || !!state.winnerId}
                title={playable ? "Play card" : "Not playable"}
              >
                {renderCardFace(card)}
              </button>
            );
          })}
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
    </main>
  );
}
