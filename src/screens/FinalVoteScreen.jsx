import { Check } from "lucide-react";
import { ALL_PLACES } from "../data/places.js";

export function FinalVoteScreen({ room, me, testMode, finalSel, toggleFinal, doFinalSubmit, submitted, timerLeft }) {
  const subCount = Object.keys(room.finalVotes).length;
  const urgent = timerLeft <= 10;

  return (
    <div className="app grain">
      {testMode && <div className="test-banner">TEST MODE</div>}
      <div style={{ padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div><p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 2 }}>ROUND {room.finalRound}</p><h2 className="syne" style={{ fontSize: 22 }}>Final Vote</h2><p style={{ color: "var(--td)", fontSize: 13 }}>Pick up to {room.finalMaxSelections} · {subCount}/{room.players.length} voted</p></div>
          <div className="timer-ring" style={{ color: urgent ? "var(--red)" : "var(--t)", animation: urgent ? "timer-pulse .5s infinite" : "none", textShadow: urgent ? "0 0 20px currentColor" : "none" }}>{timerLeft}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {room.finalOptions.map((pid) => { const place = ALL_PLACES.find((p) => p.id === pid); if (!place) return null; const isSel = finalSel.includes(pid); const atMax = finalSel.length >= room.finalMaxSelections; const dis = submitted || (!isSel && atMax);
            return (<div key={pid} className={`final-option ${isSel ? "sel" : ""} ${dis && !isSel ? "dis" : ""}`} onClick={() => !dis && toggleFinal(pid)}>
              <span style={{ fontSize: 28 }}>{place.img}</span>
              <div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{place.name}</p><p style={{ color: "var(--td)", fontSize: 12 }}>{place.vibe}</p></div>
              {isSel && (<div className="bounce-in" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={16} color="#07070c" /></div>)}
            </div>);
          })}
        </div>
        <span style={{ fontSize: 13, color: "var(--td)" }}>{finalSel.length}/{room.finalMaxSelections} selected</span>
        {!submitted ? (<button onClick={doFinalSubmit} style={{ width: "100%", marginTop: 12, padding: 16, borderRadius: 14, background: finalSel.length > 0 ? "var(--gold)" : "var(--s)", border: "none", color: finalSel.length > 0 ? "#07070c" : "var(--tm)", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: "pointer" }}>{finalSel.length > 0 ? "Submit Vote" : "Skip (0 votes)"}</button>
        ) : (<p style={{ textAlign: "center", color: "var(--green)", fontWeight: 600, fontSize: 14, padding: "12px 0" }}>✓ Submitted — waiting for others</p>)}
      </div>
    </div>
  );
}

export function FinalResultsScreen({ room, testMode, isHost, handleFinalProceed }) {
  const counts = {}; room.finalOptions.forEach((id) => { counts[id] = { c: 0, v: [] }; });
  Object.entries(room.finalVotes).forEach(([p, sels]) => { sels.forEach((id) => { if (counts[id]) { counts[id].c++; counts[id].v.push(p); } }); });
  const sorted = Object.entries(counts).sort((a, b) => b[1].c - a[1].c);
  const with5 = sorted.filter(([, d]) => d.c === 5); const winner = with5.length === 1 ? with5[0][0] : null;

  return (
    <div className="app grain">
      {testMode && <div className="test-banner">TEST MODE</div>}
      <div className="fade-up" style={{ padding: "32px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}><p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>ROUND {room.finalRound}</p><h2 className="syne" style={{ fontSize: 24 }}>{winner ? "We're going to..." : "Not quite — revote! 🔄"}</h2></div>
        {sorted.map(([id, data]) => { const place = ALL_PLACES.find((p) => p.id === id); const pct = (data.c / room.players.length) * 100;
          return (<div key={id} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{place?.img} {place?.name || id}</span><span style={{ fontSize: 13, fontWeight: 700, color: data.c === 5 ? "var(--green)" : "var(--td)" }}>{data.c}/{room.players.length}</span></div><div className="vote-bar"><div className="vote-bar-fill" style={{ width: `${Math.max(pct, 8)}%`, background: data.c === 5 ? "linear-gradient(90deg,var(--green),#22D3EE)" : "var(--sh)", color: data.c === 5 ? "#07070c" : "var(--td)" }}>{data.v.join(", ")}</div></div></div>);
        })}
        {isHost && (<button onClick={handleFinalProceed} style={{ width: "100%", marginTop: 24, padding: 16, borderRadius: 14, background: "var(--gold)", border: "none", color: "#07070c", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: "pointer" }}>{winner ? "Let's Go! 🎉" : "Revote →"}</button>)}
      </div>
    </div>
  );
}
