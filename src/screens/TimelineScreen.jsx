import { ArrowLeft, MapPin, Clock } from "lucide-react";
import { ALL_PLACES, CATEGORIES } from "../data/places.js";

const DAYS = [
  { key: "fri", label: "Friday", date: "Mar 20", slots: [
    { time: "3:00 PM", label: "Arrival & Check-in", type: "fixed" },
    { time: "5:00 PM", label: "Afternoon Activity", type: "slot", slotId: "fri-afternoon" },
    { time: "8:00 PM", label: "Dinner", type: "slot", slotId: "fri-dinner" },
    { time: "10:00 PM", label: "Late Night", type: "slot", slotId: "fri-late" },
  ]},
  { key: "sat", label: "Saturday", date: "Mar 21", slots: [
    { time: "10:00 AM", label: "Brunch / Morning", type: "slot", slotId: "sat-morning" },
    { time: "1:00 PM", label: "Afternoon Chill", type: "slot", slotId: "sat-afternoon" },
    { time: "5:00 PM", label: "Sunset Activity", type: "slot", slotId: "sat-sunset" },
    { time: "8:00 PM", label: "Dinner", type: "slot", slotId: "sat-dinner" },
    { time: "11:00 PM", label: "Night Out", type: "slot", slotId: "sat-late" },
  ]},
  { key: "sun", label: "Sunday", date: "Mar 22", slots: [
    { time: "10:00 AM", label: "Morning", type: "slot", slotId: "sun-morning" },
    { time: "1:00 PM", label: "Lunch", type: "slot", slotId: "sun-lunch" },
    { time: "4:00 PM", label: "Departure", type: "fixed" },
  ]},
];

export default function TimelineScreen({ room, onBack }) {
  const decidedPlaces = [];
  if (room.decidedPlace) {
    const p = ALL_PLACES.find((pl) => pl.id === room.decidedPlace);
    if (p) decidedPlaces.push(p);
  }
  const timeline = room.timeline || {};

  return (
    <div className="app grain">
      <div style={{ padding: "24px 20px", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--td)", cursor: "pointer", padding: 4, display: "flex" }}><ArrowLeft size={20} /></button>
          <h2 className="syne" style={{ fontSize: 22 }}>Timeline</h2>
        </div>
        <p style={{ color: "var(--td)", fontSize: 13, marginBottom: 28, paddingLeft: 32 }}>March 20–22, 2026 · Dubai Weekend</p>

        {DAYS.map((day) => (
          <div key={day.key} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
              <span className="syne" style={{ fontSize: 18, fontWeight: 800, color: "var(--gold)" }}>{day.label}</span>
              <span style={{ fontSize: 13, color: "var(--td)" }}>{day.date}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {day.slots.map((slot, si) => {
                const assignedPlace = timeline[slot.slotId] ? ALL_PLACES.find((p) => p.id === timeline[slot.slotId]) : null;
                const isLast = si === day.slots.length - 1;
                return (
                  <div key={slot.slotId || slot.time} style={{ display: "flex", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: slot.type === "fixed" ? "var(--td)" : assignedPlace ? "var(--gold)" : "var(--b)", border: `2px solid ${slot.type === "fixed" ? "var(--td)" : assignedPlace ? "var(--gold)" : "var(--bl)"}`, flexShrink: 0, marginTop: 4 }} />
                      {!isLast && <div style={{ width: 2, flex: 1, background: "var(--b)", minHeight: 40 }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <Clock size={12} style={{ color: "var(--td)" }} />
                        <span style={{ fontSize: 12, color: "var(--td)", fontWeight: 600 }}>{slot.time}</span>
                      </div>
                      {slot.type === "fixed" ? (
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--tm)" }}>{slot.label}</p>
                      ) : assignedPlace ? (
                        <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--gd)", border: "1px solid rgba(240,168,48,0.2)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 20 }}>{assignedPlace.img}</span>
                            <span className="syne" style={{ fontSize: 14, fontWeight: 700 }}>{assignedPlace.name}</span>
                          </div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <span style={{ padding: "2px 8px", borderRadius: 6, background: "var(--gd)", color: "var(--gold)", fontSize: 11, fontWeight: 700 }}>{"$".repeat(assignedPlace.cost)}</span>
                            {(() => { const c = CATEGORIES.find((cat) => cat.id === assignedPlace.cat); return c ? <span style={{ padding: "2px 8px", borderRadius: 6, background: `${c.color}22`, color: c.color, fontSize: 11 }}>{c.emoji} {c.label}</span> : null; })()}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--s)", border: "1px dashed var(--b)", display: "flex", alignItems: "center", gap: 8 }}>
                          <MapPin size={14} style={{ color: "var(--tm)" }} />
                          <span style={{ fontSize: 13, color: "var(--tm)" }}>{slot.label} — vote to fill</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {decidedPlaces.length > 0 && (
          <div style={{ marginTop: 16, padding: 16, borderRadius: 14, background: "var(--s)", border: "1px solid var(--b)" }}>
            <p className="syne" style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)", marginBottom: 8, letterSpacing: 1 }}>DECIDED SO FAR</p>
            {decidedPlaces.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                <span style={{ fontSize: 20 }}>{p.img}</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
