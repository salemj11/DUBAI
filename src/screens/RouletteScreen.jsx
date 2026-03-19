import { useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { ALL_PLACES, CATEGORIES } from "../data/places.js";

const WHEEL_COLORS = [
  "#F0A830", "#3ECFCF", "#C76BFF", "#34D399",
  "#F87171", "#60A5FA", "#FBBF24", "#A78BFA",
];

export default function RouletteScreen({ room, onBack }) {
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [rotation, setRotation] = useState(0);

  // Candidates: final vote options, or category places, or all places
  const candidates = (() => {
    if (room.finalOptions && room.finalOptions.length > 0) {
      return room.finalOptions.map((id) => ALL_PLACES.find((p) => p.id === id)).filter(Boolean);
    }
    if (room.winningCategory) {
      return ALL_PLACES.filter((p) => p.cat === room.winningCategory);
    }
    return ALL_PLACES.slice(0, 8);
  })();

  const segmentAngle = 360 / candidates.length;

  const handleSpin = () => {
    if (spinning || candidates.length === 0) return;
    setSpinning(true);
    setWinner(null);
    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    const targetAngle = 360 - (winnerIndex * segmentAngle + segmentAngle / 2);
    const totalRotation = rotation + extraSpins * 360 + targetAngle;
    setRotation(totalRotation);
    setTimeout(() => { setSpinning(false); setWinner(candidates[winnerIndex]); }, 4200);
  };

  return (
    <div className="app grain">
      <div style={{ padding: "24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--td)", cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
          <h2 className="syne" style={{ fontSize: 22 }}>Roulette</h2>
        </div>

        {/* Wheel */}
        <div style={{ position: "relative", width: "100%", maxWidth: 320, margin: "0 auto 24px", aspectRatio: "1" }}>
          <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", zIndex: 10, width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "20px solid var(--gold)", filter: "drop-shadow(0 2px 8px rgba(240,168,48,0.5))" }} />
          <svg viewBox="0 0 300 300" style={{ width: "100%", height: "100%", transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none" }}>
            {candidates.map((place, i) => {
              const sa = i * segmentAngle, ea = sa + segmentAngle;
              const sr = (sa - 90) * Math.PI / 180, er = (ea - 90) * Math.PI / 180;
              const x1 = 150 + 140 * Math.cos(sr), y1 = 150 + 140 * Math.sin(sr);
              const x2 = 150 + 140 * Math.cos(er), y2 = 150 + 140 * Math.sin(er);
              const la = segmentAngle > 180 ? 1 : 0;
              const mr = ((sa + ea) / 2 - 90) * Math.PI / 180;
              const tx = 150 + 85 * Math.cos(mr), ty = 150 + 85 * Math.sin(mr);
              const tr = (sa + ea) / 2;
              return (
                <g key={place.id}>
                  <path d={`M150,150 L${x1},${y1} A140,140 0 ${la},1 ${x2},${y2} Z`} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="var(--bg)" strokeWidth="2" opacity={0.85} />
                  <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" transform={`rotate(${tr}, ${tx}, ${ty})`} style={{ fontSize: candidates.length > 6 ? 10 : 13, fontWeight: 700, fill: "#07070c", fontFamily: "'Syne',sans-serif" }}>{place.img}</text>
                </g>
              );
            })}
            <circle cx="150" cy="150" r="24" fill="var(--bg)" stroke="var(--bl)" strokeWidth="2" />
            <text x="150" y="150" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 16, fontWeight: 800, fill: "var(--gold)", fontFamily: "'Syne',sans-serif" }}>?</text>
          </svg>
        </div>

        {/* Result */}
        {winner ? (
          <div className="bounce-in" style={{ textAlign: "center", padding: 20, borderRadius: 16, background: "var(--gd)", border: "1px solid rgba(240,168,48,0.3)", marginBottom: 16 }}>
            <span style={{ fontSize: 48, display: "block", marginBottom: 8 }}>{winner.img}</span>
            <p className="syne" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{winner.name}</p>
            <p style={{ color: "var(--td)", fontSize: 13 }}>{winner.vibe}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
              <span style={{ padding: "4px 10px", borderRadius: 6, background: "var(--gd)", color: "var(--gold)", fontSize: 12, fontWeight: 700 }}>{"$".repeat(winner.cost)}</span>
              {(() => { const c = CATEGORIES.find((cat) => cat.id === winner.cat); return c ? <span style={{ padding: "4px 10px", borderRadius: 6, background: `${c.color}22`, color: c.color, fontSize: 12, fontWeight: 600 }}>{c.emoji} {c.label}</span> : null; })()}
            </div>
          </div>
        ) : (
          <p style={{ textAlign: "center", color: "var(--td)", fontSize: 13, marginBottom: 16 }}>{candidates.length} option{candidates.length !== 1 ? "s" : ""} on the wheel</p>
        )}
        <button onClick={winner ? () => { setWinner(null); handleSpin(); } : handleSpin} disabled={spinning} style={{ width: "100%", padding: 16, borderRadius: 14, background: spinning ? "var(--s)" : "var(--gold)", border: "none", color: spinning ? "var(--tm)" : "#07070c", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: spinning ? "not-allowed" : "pointer" }}>
          {spinning ? "Spinning..." : winner ? "Spin Again" : "Spin!"}
        </button>
      </div>
    </div>
  );
}
