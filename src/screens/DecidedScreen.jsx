import { RotateCcw, Star, Disc, Clock } from "lucide-react";
import { ALL_PLACES, CATEGORIES } from "../data/places.js";

export default function DecidedScreen({ room, isHost, handleReset, onRoulette, onTimeline }) {
  const place = ALL_PLACES.find((p) => p.id === room.decidedPlace);
  const cat = CATEGORIES.find((c) => c.id === place?.cat);

  return (
    <div className="app grain">
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div className="bounce-in" style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--gd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 24, border: "2px solid rgba(240,168,48,0.3)" }}>{place?.img || "🎉"}</div>
        <p className="fade-up s1" style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 3, marginBottom: 8 }}>IT'S DECIDED</p>
        <h1 className="syne fade-up s2" style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{place?.name}</h1>
        <p className="fade-up s3" style={{ color: "var(--td)", fontSize: 15, marginBottom: 4 }}>{place?.vibe}</p>
        <div className="fade-up s4" style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 32 }}>
          <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--gd)", color: "var(--gold)", fontSize: 13, fontWeight: 700 }}>{"$".repeat(place?.cost || 1)}</span>
          <span style={{ padding: "6px 14px", borderRadius: 8, background: cat ? `${cat.color}22` : "var(--s)", color: cat?.color, fontSize: 13, fontWeight: 600 }}>{cat?.emoji} {cat?.label}</span>
          {place?.rating && <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--sh)", color: "var(--td)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Star size={12} /> {place.rating}</span>}
        </div>

        {/* Action buttons */}
        <div className="fade-up s5" style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 300 }}>
          <button onClick={handleReset} style={{
            width: "100%", padding: 16, borderRadius: 14,
            background: "var(--gold)", border: "none", color: "#07070c",
            fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <RotateCcw size={16} /> New Round
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onRoulette} style={{
              flex: 1, padding: "12px 16px", borderRadius: 12,
              background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)",
              fontSize: 14, fontWeight: 600, fontFamily: "'Syne',sans-serif",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Disc size={15} /> Roulette
            </button>
            <button onClick={onTimeline} style={{
              flex: 1, padding: "12px 16px", borderRadius: 12,
              background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)",
              fontSize: 14, fontWeight: 600, fontFamily: "'Syne',sans-serif",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Clock size={15} /> Timeline
            </button>
          </div>

          {isHost && (
            <button onClick={() => { if (confirm("Reset the entire room? Everyone will need to rejoin.")) handleReset(); }} style={{
              width: "100%", padding: 10, borderRadius: 10, marginTop: 8,
              background: "var(--redd)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--red)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Syne',sans-serif",
            }}>
              🔒 Reset Room (host only)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
