import SwipeStack from "../components/SwipeStack.jsx";
import Waiting from "../components/Waiting.jsx";
import { CATEGORIES } from "../data/places.js";

export default function SubcatSwipeScreen({ room, me, testMode, subcatCards, handleSubcatSwipe }) {
  const myDone = room.subcatSwipes[me]?.done;
  const cat = CATEGORIES.find((c) => c.id === room.winningCategory);

  if (myDone) {
    const dc = room.players.filter((p) => room.subcatSwipes[p]?.done).length;
    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <Waiting message="Nice picks! 🎯" sub={`${dc}/${room.players.length} done swiping`} players={room.players.filter((p) => room.subcatSwipes[p]?.done)} max={room.players.length} />
      </div>
    );
  }

  return (
    <div className="app grain">
      {testMode && <div className="test-banner">TEST MODE</div>}
      <div style={{ padding: "24px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, color: cat?.color, marginBottom: 4 }}>{cat?.emoji} {cat?.label?.toUpperCase()}</p>
          <h2 className="syne" style={{ fontSize: 22, marginBottom: 4 }}>What sounds good?</h2>
          <p style={{ color: "var(--td)", fontSize: 13 }}>Swipe right on what you're into</p>
        </div>
        {subcatCards.length > 0 ? (
          <SwipeStack cards={subcatCards} onSwipe={handleSubcatSwipe} renderCard={(card) => (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: "var(--bg)" }}>
              <span style={{ fontSize: 72, marginBottom: 16 }}>{card.emoji}</span>
              <h3 className="syne" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{card.label}</h3>
              <span style={{ padding: "4px 14px", borderRadius: 100, background: "var(--sh)", color: "var(--td)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{card.group === "cuisine" ? "Cuisine" : card.group === "location" ? "Area" : card.group === "type" ? "Type" : card.group}</span>
            </div>
          )} />
        ) : (<div style={{ textAlign: "center", padding: 40 }}><div className="waiting-dots"><span /><span /><span /></div><p style={{ color: "var(--td)", marginTop: 12 }}>Saving picks...</p></div>)}
      </div>
    </div>
  );
}
