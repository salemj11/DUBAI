import { Star } from "lucide-react";
import SwipeStack from "../components/SwipeStack.jsx";
import Waiting from "../components/Waiting.jsx";
import { CATEGORIES, MAX_PLACE_SWIPES } from "../data/places.js";

export default function PlaceSwipeScreen({ room, me, testMode, placeCards, placeSwipesLeft, handlePlaceSwipe }) {
  const myDone = room.placeSwipes[me]?.done;
  const cat = CATEGORIES.find((c) => c.id === room.winningCategory);

  if (myDone) {
    const dc = room.players.filter((p) => room.placeSwipes[p]?.done).length;
    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <Waiting message="Picks locked in! 🔒" sub={`${dc}/${room.players.length} done`} players={room.players.filter((p) => room.placeSwipes[p]?.done)} max={room.players.length} />
      </div>
    );
  }

  return (
    <div className="app grain">
      {testMode && <div className="test-banner">TEST MODE</div>}
      <div style={{ padding: "24px 20px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, color: cat?.color, marginBottom: 4 }}>{cat?.emoji} PICK YOUR SPOTS</p>
          <h2 className="syne" style={{ fontSize: 22, marginBottom: 4 }}>Swipe right on 5 places</h2>
          <p style={{ color: "var(--td)", fontSize: 13 }}>Choose wisely — only 5 swipes!</p>
        </div>
        {(placeCards.length > 0 && placeSwipesLeft > 0) ? (
          <SwipeStack cards={placeCards} onSwipe={handlePlaceSwipe} swipesLeft={placeSwipesLeft} maxSwipes={MAX_PLACE_SWIPES} renderCard={(place) => (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: 24, justifyContent: "space-between", background: "var(--bg)" }}>
              <div>
                <div style={{ width: "100%", height: 150, borderRadius: 14, background: `linear-gradient(135deg, ${cat?.color}22, ${cat?.color}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, marginBottom: 16 }}>{place.img}</div>
                <h3 className="syne" style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{place.name}</h3>
                <p style={{ color: "var(--td)", fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>{place.vibe}</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: "var(--gd)", color: "var(--gold)", fontSize: 14, fontWeight: 700 }}>{"$".repeat(place.cost)}</span>
                <span style={{ padding: "6px 12px", borderRadius: 8, background: "var(--sh)", color: "var(--td)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Star size={12} /> {place.rating}</span>
                {place.tags.map((t) => (<span key={t} style={{ padding: "6px 12px", borderRadius: 8, background: "var(--s)", color: "#aaa", fontSize: 12 }}>{t}</span>))}
              </div>
            </div>
          )} />
        ) : (<div style={{ textAlign: "center", padding: 40 }}><div className="bounce-in" style={{ fontSize: 48, marginBottom: 16 }}>✅</div><p className="syne" style={{ fontSize: 18, fontWeight: 700 }}>{placeSwipesLeft <= 0 ? "All swipes used!" : "Deck cleared!"}</p></div>)}
      </div>
    </div>
  );
}
