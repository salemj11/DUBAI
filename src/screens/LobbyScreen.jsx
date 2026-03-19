import { Crown } from "lucide-react";
import Dots from "../components/Dots.jsx";
import Waiting from "../components/Waiting.jsx";
import { MAX_PLAYERS } from "../data/places.js";

export default function LobbyScreen({ room, displayPlayers, me, testMode, isHost, fillTestPlayers, handleStart }) {
  const canStart = displayPlayers.length >= MAX_PLAYERS;
  return (
    <div className="app grain">
      {testMode && <div className="test-banner">TEST MODE</div>}
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <h2 className="syne fade-up" style={{ fontSize: 28, marginBottom: 8 }}>Waiting Room</h2>
        <p className="fade-up s1" style={{ color: "var(--td)", marginBottom: 32 }}>{displayPlayers.length}/{MAX_PLAYERS} players</p>
        <Dots players={displayPlayers} max={MAX_PLAYERS} />
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
          {displayPlayers.map((p, i) => (
            <div key={p} className={`fade-up s${i + 1}`} style={{ padding: "12px 16px", borderRadius: 12, background: p === me ? "var(--gd)" : "var(--s)", border: `1px solid ${p === me ? "rgba(240,168,48,0.3)" : "var(--b)"}`, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: p === me ? "var(--gold)" : "var(--sh)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: p === me ? "#07070c" : "var(--t)" }}>{p.charAt(0).toUpperCase()}</div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{p}</span>
              {i === 0 && <Crown size={14} style={{ color: "var(--gold)", marginLeft: "auto" }} />}
              {p === me && <span style={{ marginLeft: i === 0 ? 4 : "auto", fontSize: 11, color: "var(--td)" }}>(you)</span>}
            </div>
          ))}
        </div>
        {isHost && !canStart && (<button onClick={fillTestPlayers} style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 12, background: "var(--redd)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🧪 Fill with test players</button>)}
        {isHost && (<button onClick={canStart ? handleStart : undefined} style={{ width: "100%", marginTop: 16, padding: 16, borderRadius: 14, background: canStart ? "var(--gold)" : "var(--s)", border: "none", color: canStart ? "#07070c" : "var(--tm)", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: canStart ? "pointer" : "not-allowed" }}>{canStart ? "Start →" : `Need ${MAX_PLAYERS - displayPlayers.length} more`}</button>)}
        {!isHost && <Waiting message="Waiting for host..." sub="Hang tight" />}
      </div>
    </div>
  );
}
