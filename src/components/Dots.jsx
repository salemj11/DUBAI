import { MAX_PLAYERS } from "../data/places.js";

export default function Dots({ players, max }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {Array.from({ length: max || MAX_PLAYERS }).map((_, i) => {
        const p = players[i];
        return (
          <div key={i} style={{ width: 40, height: 40, borderRadius: "50%", background: p ? "var(--sh)" : "var(--s)", border: `2px solid ${p ? "var(--bl)" : "var(--b)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: p ? "var(--t)" : "var(--tm)", transition: "all .3s" }}>
            {p ? p.charAt(0).toUpperCase() : "?"}
          </div>
        );
      })}
    </div>
  );
}
