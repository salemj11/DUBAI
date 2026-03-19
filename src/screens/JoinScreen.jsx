import Dots from "../components/Dots.jsx";
import { MAX_PLAYERS } from "../data/places.js";

export default function JoinScreen({ room, nameInput, setNameInput, handleJoin }) {
  return (
    <div className="app grain">
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="fade-up" style={{ textAlign: "center", width: "100%", maxWidth: 340 }}>
          <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: 100, background: "var(--gd)", color: "var(--gold)", fontSize: 11, fontWeight: 600, letterSpacing: 3, marginBottom: 20 }}>MARCH 20–22</div>
          <h1 className="syne" style={{ fontSize: 64, fontWeight: 800, lineHeight: .95, letterSpacing: -3, marginBottom: 4, background: "linear-gradient(135deg, #fff 30%, var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DUBAI</h1>
          <p style={{ color: "var(--td)", fontSize: 16, letterSpacing: 2, marginBottom: 40 }}>WEEKEND</p>
          <Dots players={room.players} max={MAX_PLAYERS} />
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 12, marginBottom: 32 }}>{room.players.length}/{MAX_PLAYERS} joined{room.players.length > 0 && ` · ${room.players.join(", ")}`}</p>
          {room.players.length < MAX_PLAYERS ? (
            <>
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleJoin()} placeholder="Enter your name" style={{ width: "100%", padding: "16px 20px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 16, fontFamily: "'Outfit',sans-serif", outline: "none", textAlign: "center", marginBottom: 12 }} />
              <button onClick={handleJoin} style={{ width: "100%", padding: 16, borderRadius: 14, background: nameInput.trim() ? "var(--gold)" : "var(--s)", border: "none", color: nameInput.trim() ? "#07070c" : "var(--tm)", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: nameInput.trim() ? "pointer" : "not-allowed" }}>Join Room</button>
            </>
          ) : (<p style={{ color: "var(--gold)", fontWeight: 600, fontSize: 14 }}>Room is full!</p>)}
        </div>
      </div>
    </div>
  );
}
