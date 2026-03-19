import Dots from "./Dots.jsx";
import { MAX_PLAYERS } from "../data/places.js";

export default function Waiting({ message, sub, players, max }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div className="waiting-dots" style={{ marginBottom: 24 }}><span /><span /><span /></div>
      <h2 className="syne" style={{ fontSize: 22, marginBottom: 8 }}>{message}</h2>
      <p style={{ color: "var(--td)", fontSize: 14, marginBottom: 24 }}>{sub}</p>
      {players && <Dots players={players} max={max || MAX_PLAYERS} />}
    </div>
  );
}
