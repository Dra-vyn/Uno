// small helper for rendering discard content (kept minimal for now)
import React from "react";

export default function DiscardContent({ card }) {
  if (!card) return <span>UNO</span>;
  if (card.type === "wild" || card.type === "plus4") {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <div style={{ width: 24, height: 24, background: "#ef4444" }} />
        <div style={{ width: 24, height: 24, background: "#3b82f6" }} />
        <div style={{ width: 24, height: 24, background: "#22c55e" }} />
        <div style={{ width: 24, height: 24, background: "#facc15" }} />
      </div>
    );
  }
  return (
    <span style={{ fontSize: "inherit", fontWeight: 700 }}>{card.display}</span>
  );
}
