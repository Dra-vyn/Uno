export default function Lobby({
  roomId,
  players,
  hostId,
  selfId,
  statusMessage,
  canStart,
  onStart,
  error,
}) {
  return (
    <section className="game-container">
      <aside className="sidebar">
        <div className="logo">UNO</div>
        <div className="room-info">
          <h3>Room: {roomId}</h3>
          <p>{statusMessage}</p>
        </div>
        <div className="divider" />
        <div className="players-title">Players ({players.length}/2)</div>
        {players.map((player) => (
          <div key={player.id} className="player-item">
            <div className="player-left">
              <div className="avatar" />
              <span>
                {player.name}
                {player.id === hostId ? " (Host)" : ""}
                {player.id === selfId ? " (You)" : ""}
              </span>
            </div>
            <div
              className={`online-dot ${player.connected ? "online" : "offline"}`}
            />
          </div>
        ))}
        <button className="start-btn" onClick={onStart} disabled={!canStart}>
          {canStart ? "Start Game" : "Waiting..."}
        </button>
        {error && <div className="error">{error}</div>}
      </aside>
    </section>
  );
}
