import { Check } from "lucide-react";
import Waiting from "../components/Waiting.jsx";
import { CATEGORIES } from "../data/places.js";

export function CategoryVoteScreen({ room, me, testMode, isHost, selectedCat, setSelectedCat, handleCatVote, handleCatReveal }) {
  const myVote = room.categoryVotes[me];
  const allVoted = room.players.every((p) => room.categoryVotes[p]);
  const votedCount = Object.keys(room.categoryVotes).length;

  return (
    <div className="app grain">
      {testMode && <div className="test-banner">TEST MODE</div>}
      <div style={{ padding: "32px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>ROUND {room.round}</p>
          <h2 className="syne" style={{ fontSize: 26, marginBottom: 6 }}>What are we doing?</h2>
          <p style={{ color: "var(--td)", fontSize: 14 }}>{votedCount}/{room.players.length} voted</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {room.categoryOptions.map((catId, i) => {
            const cat = CATEGORIES.find((c) => c.id === catId); if (!cat) return null;
            return (<button key={catId} className={`cat-btn card-enter s${i + 1} ${selectedCat === catId ? "selected" : ""}`} onClick={() => !myVote && setSelectedCat(catId)} disabled={!!myVote} style={myVote ? { opacity: myVote === catId ? 1 : 0.3, cursor: "default" } : {}}>
              <span style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: `${cat.color}22`, flexShrink: 0 }}>{cat.emoji}</span>
              <span>{cat.label}</span>
              {myVote === catId && <Check size={20} style={{ marginLeft: "auto", color: "var(--green)" }} />}
            </button>);
          })}
        </div>
        {!myVote ? (<button onClick={handleCatVote} disabled={!selectedCat} style={{ width: "100%", padding: 16, borderRadius: 14, background: selectedCat ? "var(--gold)" : "var(--s)", border: "none", color: selectedCat ? "#07070c" : "var(--tm)", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: selectedCat ? "pointer" : "not-allowed" }}>Lock In</button>
        ) : !allVoted ? (<Waiting message="Vote locked in!" sub={`Waiting for ${room.players.filter((p) => !room.categoryVotes[p]).join(", ")}`} />
        ) : isHost ? (<button onClick={handleCatReveal} style={{ width: "100%", padding: 16, borderRadius: 14, background: "var(--gold)", border: "none", color: "#07070c", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: "pointer" }}>Reveal Results</button>
        ) : (<Waiting message="All votes in!" sub="Host is revealing..." />)}
      </div>
    </div>
  );
}

export function CategoryResultsScreen({ room, testMode, isHost, handleCatProceed }) {
  const counts = {}; room.categoryOptions.forEach((c) => { counts[c] = { c: 0, v: [] }; });
  Object.entries(room.categoryVotes).forEach(([p, cat]) => { if (counts[cat]) { counts[cat].c++; counts[cat].v.push(p); } });
  const sorted = Object.entries(counts).sort((a, b) => b[1].c - a[1].c);
  const maxV = sorted[0]?.[1].c || 0; const winner = maxV >= 3 ? sorted[0][0] : null;

  return (
    <div className="app grain">
      {testMode && <div className="test-banner">TEST MODE</div>}
      <div className="fade-up" style={{ padding: "32px 20px" }}>
        <h2 className="syne" style={{ fontSize: 24, marginBottom: 24, textAlign: "center" }}>{winner ? "We have a winner!" : "It's a tie! 🔄"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {sorted.map(([id, data]) => { const cat = CATEGORIES.find((c) => c.id === id); const pct = room.players.length > 0 ? (data.c / room.players.length) * 100 : 0;
            return (<div key={id}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 14, fontWeight: 600 }}>{cat?.emoji} {cat?.label}</span><span style={{ fontSize: 14, color: "var(--td)" }}>{data.c} vote{data.c !== 1 ? "s" : ""}</span></div>
              <div className="vote-bar"><div className="vote-bar-fill" style={{ width: `${Math.max(pct, 5)}%`, background: id === winner ? (cat?.gradient || "var(--gold)") : "var(--sh)", color: id === winner ? "#07070c" : "#bbb" }}>{data.v.join(", ")}</div></div></div>);
          })}
        </div>
        {winner && (<div className="bounce-in" style={{ textAlign: "center", padding: 20, borderRadius: 16, background: "var(--gd)", border: "1px solid rgba(240,168,48,0.3)", marginBottom: 20 }}><p style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>WINNER</p><p className="syne" style={{ fontSize: 28, fontWeight: 800 }}>{CATEGORIES.find((c) => c.id === winner)?.emoji} {CATEGORIES.find((c) => c.id === winner)?.label}</p></div>)}
        {isHost && (<button onClick={handleCatProceed} style={{ width: "100%", padding: 16, borderRadius: 14, background: "var(--gold)", border: "none", color: "#07070c", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: "pointer" }}>{winner ? "Continue →" : "Revote →"}</button>)}
      </div>
    </div>
  );
}
