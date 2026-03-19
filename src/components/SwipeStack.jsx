import { useState, useRef } from "react";
import { Check, X } from "lucide-react";
import { SWIPE_THRESHOLD } from "../data/places.js";

export default function SwipeStack({ cards, onSwipe, swipesLeft, maxSwipes, renderCard }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exitDir, setExitDir] = useState(null);
  const startX = useRef(0);

  const doSwipe = (dir) => {
    if (cards.length === 0) return;
    if (dir === "right" && maxSwipes && swipesLeft <= 0) return;
    setExitDir(dir);
    setTimeout(() => { onSwipe(dir, cards[0]); setExitDir(null); setDx(0); }, 350);
  };

  const handleStart = (cx) => { setDragging(true); startX.current = cx; };
  const handleMove = (cx) => { if (dragging) setDx(cx - startX.current); };
  const handleEnd = () => {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? "right" : "left";
      if (dir === "right" && maxSwipes && swipesLeft <= 0) { setDx(0); return; }
      doSwipe(dir);
    } else { setDx(0); }
  };

  if (cards.length === 0) return null;
  const rightOp = Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1);
  const leftOp = Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1);
  const noSwipes = maxSwipes && swipesLeft <= 0;

  return (
    <div>
      {maxSwipes && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          {Array.from({ length: maxSwipes }).map((_, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < swipesLeft ? "var(--green)" : "var(--sh)", border: `1px solid ${i < swipesLeft ? "var(--green)" : "var(--b)"}`, transition: "all .3s" }} />
          ))}
          <span style={{ fontSize: 12, color: "var(--td)", marginLeft: 8 }}>{swipesLeft} swipe{swipesLeft !== 1 ? "s" : ""} left</span>
        </div>
      )}
      <div className="swipe-stack">
        {cards.slice(1, 3).reverse().map((c, i) => {
          const stackIndex = cards.slice(1, 3).length - 1 - i;
          return (
            <div key={c.id} className="swipe-card" style={{
              transform: `scale(${1 - (stackIndex + 1) * 0.04}) translateY(${(stackIndex + 1) * 10}px)`,
              zIndex: 10 - stackIndex - 1,
              background: "var(--bg)",
              border: "1px solid var(--b)",
              overflow: "hidden",
              transition: "transform 0.4s cubic-bezier(0.2, 0, 0, 1)",
            }}>
              {renderCard(c)}
            </div>
          );
        })}
        <div className="swipe-card" style={{
          zIndex: 10,
          transform: exitDir
            ? `translateX(${exitDir === "right" ? "120%" : "-120%"}) rotate(${exitDir === "right" ? 20 : -20}deg)`
            : `translateX(${dx}px) rotate(${dx * 0.05}deg) scale(${1 - Math.abs(dx) * 0.0003})`,
          opacity: exitDir ? 0 : 1,
          transition: dragging ? "none" : exitDir
            ? "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out"
            : "transform 0.5s cubic-bezier(0.2, 0, 0, 1)",
          background: "var(--bg)", border: "1px solid var(--b)", overflow: "hidden",
          boxShadow: dragging ? "0 12px 40px rgba(0,0,0,0.4)" : "none",
        }}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX)}
          onTouchEnd={handleEnd}
          onMouseDown={(e) => handleStart(e.clientX)}
          onMouseMove={(e) => handleMove(e.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={() => { if (dragging) handleEnd(); }}
        >
          <div className="swipe-overlay" style={{ background: `rgba(52,211,153,${rightOp * 0.3})`, border: rightOp > 0.3 ? "3px solid var(--green)" : "none", opacity: rightOp > 0 ? 1 : 0, transition: "opacity 0.15s ease-out" }}>{noSwipes ? "MAX" : "YES ✓"}</div>
          <div className="swipe-overlay" style={{ background: `rgba(248,113,113,${leftOp * 0.3})`, border: leftOp > 0.3 ? "3px solid var(--red)" : "none", opacity: leftOp > 0 ? 1 : 0, transition: "opacity 0.15s ease-out" }}>NOPE ✗</div>
          {renderCard(cards[0])}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 20 }}>
        <button onClick={() => doSwipe("left")} style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--redd)", border: "2px solid rgba(248,113,113,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--red)" }}><X size={24} /></button>
        <button onClick={() => doSwipe("right")} style={{ width: 56, height: 56, borderRadius: "50%", background: noSwipes ? "var(--s)" : "var(--grnd)", border: `2px solid ${noSwipes ? "var(--b)" : "rgba(52,211,153,0.3)"}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: noSwipes ? "not-allowed" : "pointer", color: noSwipes ? "var(--tm)" : "var(--green)", opacity: noSwipes ? 0.4 : 1 }}><Check size={24} /></button>
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--tm)", marginTop: 12 }}>{cards.length - 1} more in deck</p>
    </div>
  );
}
