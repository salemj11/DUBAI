import { useState, useEffect, useCallback, useRef } from "react";
import { Check, X, RotateCcw, Crown, Star } from "lucide-react";
import { useRoom } from "./hooks/useRoom.js";
import "./App.css";

const MAX_PLAYERS = 5;
const SWIPE_THRESHOLD = 80;
const MAX_PLACE_SWIPES = 5;
const FINAL_VOTE_SECONDS = 60;
const TEST_NAMES = ["Test2", "Test3", "Test4", "Test5"];

const CATEGORIES = [
  { id: "food", label: "Food", emoji: "🍽️", color: "#F0A830", gradient: "linear-gradient(135deg, #F0A830, #E8832A)" },
  { id: "chill", label: "Chill", emoji: "🌊", color: "#3ECFCF", gradient: "linear-gradient(135deg, #3ECFCF, #2A9FD6)" },
  { id: "activity", label: "Activity", emoji: "⚡", color: "#C76BFF", gradient: "linear-gradient(135deg, #C76BFF, #8B5CF6)" },
];

const SUBCATEGORIES = {
  food: {
    cuisine: [
      { id: "indian", label: "Indian", emoji: "🍛" },
      { id: "italian", label: "Italian", emoji: "🍝" },
      { id: "japanese", label: "Japanese", emoji: "🍣" },
      { id: "arabic", label: "Arabic", emoji: "🥙" },
      { id: "greek", label: "Greek", emoji: "🫒" },
      { id: "mediterranean", label: "Mediterranean", emoji: "🥗" },
      { id: "chinese", label: "Chinese", emoji: "🥟" },
      { id: "mexican", label: "Mexican", emoji: "🌮" },
      { id: "korean", label: "Korean", emoji: "🍜" },
      { id: "thai", label: "Thai", emoji: "🍲" },
      { id: "seafood", label: "Seafood", emoji: "🦐" },
      { id: "american", label: "American", emoji: "🍔" },
    ],
    location: [
      { id: "dubai-mall", label: "Dubai Mall", emoji: "🏬" },
      { id: "jumeirah", label: "Jumeirah", emoji: "🏖️" },
      { id: "emirates-mall", label: "Emirates Mall", emoji: "🛍️" },
      { id: "d3", label: "D3", emoji: "🎨" },
      { id: "marina", label: "Marina", emoji: "⛵" },
      { id: "jbr", label: "JBR", emoji: "🌴" },
      { id: "downtown", label: "Downtown", emoji: "🏙️" },
      { id: "difc", label: "DIFC", emoji: "💼" },
    ],
  },
  chill: {
    type: [
      { id: "beach", label: "Beach", emoji: "🏖️" },
      { id: "pool", label: "Pool", emoji: "🏊" },
      { id: "mall", label: "Mall", emoji: "🛍️" },
      { id: "coffee", label: "Coffee", emoji: "☕" },
      { id: "shisha", label: "Shisha", emoji: "💨" },
    ],
  },
};

const ALL_PLACES = [
  { id: "f1", name: "Carnival by Tresind", cat: "food", tags: ["indian", "difc"], cost: 4, rating: 4.7, vibe: "Playful, high-energy Indian fine dining that feels like a proper Saturday-night spot.", img: "🎭" },
  { id: "f2", name: "Naughty Pizza Dubai", cat: "food", tags: ["italian", "d3"], cost: 2, rating: 5.0, vibe: "Lively, easy Italian place with a fun crowd and a casual-but-still-cool feel.", img: "🍕" },
  { id: "f3", name: "Buddha-Bar", cat: "food", tags: ["japanese", "marina"], cost: 4, rating: 4.6, vibe: "Dark, dramatic, and polished with a dressed-up Dubai dinner energy.", img: "🍣" },
  { id: "f4", name: "ZETA Seventy Seven", cat: "food", tags: ["japanese", "jbr"], cost: 4, rating: 4.7, vibe: "High-floor rooftop dining with skyline views and a flashy late-evening mood.", img: "🌃" },
  { id: "f5", name: "The Noodle House - JBR", cat: "food", tags: ["japanese", "jbr"], cost: 2, rating: 4.9, vibe: "Busy, reliable, and easy for a casual lunch or low-stress group meal.", img: "🍜" },
  { id: "f6", name: "Vyne", cat: "food", tags: ["mediterranean", "d3"], cost: 2, rating: 4.8, vibe: "Relaxed terrace-style meal with a polished hotel feel and softer energy.", img: "🥗" },
  { id: "f7", name: "Eat Greek Kouzina", cat: "food", tags: ["greek", "jbr"], cost: 2, rating: 4.6, vibe: "Bright waterfront Greek spot that works well for an unfussy daytime meal.", img: "🫒" },
  { id: "f8", name: "Bolle Italian Restaurant & Bar DIFC", cat: "food", tags: ["italian", "difc"], cost: 2, rating: 4.5, vibe: "Clean, business-district Italian that feels smooth and easy rather than overhyped.", img: "🍝" },
  { id: "f9", name: "Operation Falafel The Beach Mall JBR", cat: "food", tags: ["arabic", "jbr"], cost: 1, rating: 4.3, vibe: "Cheap, quick, and solid for a late bite without turning it into a whole event.", img: "🥙" },
  { id: "c1", name: "AURA SKYPOOL", cat: "chill", tags: ["pool"], cost: 4, rating: 4.9, vibe: "Luxury infinity-pool hang with unreal views and a premium sunset crowd.", img: "🏊" },
  { id: "c2", name: "Cloud 22", cat: "chill", tags: ["pool"], cost: 4, rating: 4.7, vibe: "Flashy rooftop pool scene with a polished, high-spend Palm vibe.", img: "☁️" },
  { id: "c3", name: "Zero Gravity", cat: "chill", tags: ["beach", "pool"], cost: 3, rating: 4.7, vibe: "One of the best day-to-night beach club options if you want energy without full club pressure.", img: "🏖️" },
  { id: "c4", name: "Bla Bla Dubai", cat: "chill", tags: ["beach"], cost: 3, rating: 4.4, vibe: "Big social venue at JBR that works for lounging early and staying on later if the mood builds.", img: "🌴" },
  { id: "c5", name: "Marina Beach", cat: "chill", tags: ["beach"], cost: 1, rating: 4.4, vibe: "Simple no-booking beach option when you just want sun, water, and a walk.", img: "🌊" },
  { id: "c6", name: "Dubai Marina Mall", cat: "chill", tags: ["mall"], cost: 2, rating: 4.1, vibe: "Easy indoor reset with food, coffee, and zero effort if everyone is moving slow.", img: "🛍️" },
  { id: "c7", name: "Aaliya Shisha Lounge", cat: "chill", tags: ["shisha"], cost: 2, rating: 4.9, vibe: "Laid-back Arabic lounge for a slower evening when you want to sit and vibe.", img: "💨" },
  { id: "c8", name: "Vyne Coffee", cat: "chill", tags: ["coffee"], cost: 2, rating: 4.8, vibe: "Good fallback for a coffee-and-catch-up window with a calm terrace atmosphere.", img: "☕" },
  { id: "a1", name: "Topgolf Dubai", cat: "activity", tags: [], cost: 2, rating: 4.6, vibe: "Competitive but relaxed group activity that works especially well at night.", img: "⛳" },
  { id: "a2", name: "Dubai Marina Luxury Yacht Tour", cat: "activity", tags: [], cost: 2, rating: 4.9, vibe: "Easy flex activity with skyline views and a proper Dubai feel without needing a full charter.", img: "🛥️" },
  { id: "a3", name: "Dubai Aladdin Tour: Souks, Creek & Old Dubai", cat: "activity", tags: [], cost: 1, rating: 4.9, vibe: "A slower, more cultural switch-up if you want one block of the trip to feel different.", img: "🕌" },
  { id: "a4", name: "Dubai Red Dunes Desert Safari", cat: "activity", tags: [], cost: 2, rating: 5.0, vibe: "Classic Dubai adrenaline session with enough variety to feel like a full outing.", img: "🏜️" },
  { id: "a5", name: "IMG Worlds of Adventure", cat: "activity", tags: [], cost: 3, rating: 3.9, vibe: "Indoor, easy, and good for a long high-energy block if the weather or timing gets awkward.", img: "🎢" },
  { id: "a6", name: "Museum of the Future", cat: "activity", tags: [], cost: 2, rating: 3.3, vibe: "More about the iconic building and photo value than a pure thrill experience.", img: "🔮" },
];

function newRoom() {
  return {
    players: [], phase: "lobby", round: 1,
    isTestMode: false, testPlayers: [],
    categoryOptions: ["food", "chill", "activity"],
    categoryVotes: {}, categoryShowResults: false, winningCategory: null,
    subcatSwipes: {}, placeSwipes: {},
    finalOptions: [], finalVotes: {}, finalMaxSelections: 4,
    finalVoteEndTime: null, finalRound: 1, finalShowResults: false,
    decidedPlace: null,
  };
}

function getStoredTestPlayers(room) {
  if (!Array.isArray(room?.testPlayers)) return [];

  return room.testPlayers.filter((name) => typeof name === "string");
}

function getLobbyDisplayPlayers(room, lobbyPlayers) {
  const actualPlayers = lobbyPlayers.map((player) => player.name);

  if (actualPlayers.length === 0) {
    return [];
  }

  const syntheticPlayers = getStoredTestPlayers(room)
    .filter((name) => !actualPlayers.includes(name))
    .slice(0, MAX_PLAYERS - actualPlayers.length);

  return [...actualPlayers, ...syntheticPlayers].slice(0, MAX_PLAYERS);
}

function getAutomatedPlayers(room, me) {
  const testPlayers = new Set(getStoredTestPlayers(room));

  return room.players.filter((player) => player !== me && testPlayers.has(player));
}

function Dots({ players, max }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {Array.from({ length: max }).map((_, i) => {
        const p = players[i];
        return (
          <div key={i} style={{ width: 40, height: 40, borderRadius: "50%", background: p ? "var(--sh)" : "var(--s)", border: `2px solid ${p ? "var(--bl)" : "var(--b)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: p ? "var(--t)" : "var(--tm)", transition: "all .3s" }}>
            {p ? p.charAt(0).toUpperCase() : "?"}
          </div>
        );
      })}
    </div>
  );
}

function Waiting({ message, sub, players, max }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div className="waiting-dots" style={{ marginBottom: 24 }}><span /><span /><span /></div>
      <h2 className="syne" style={{ fontSize: 22, marginBottom: 8 }}>{message}</h2>
      <p style={{ color: "var(--td)", fontSize: 14, marginBottom: 24 }}>{sub}</p>
      {players && <Dots players={players} max={max || MAX_PLAYERS} />}
    </div>
  );
}

function SwipeStack({ cards, onSwipe, swipesLeft, maxSwipes, renderCard }) {
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

export default function App() {
  const { room: roomState, lobby, updateRoom, loading, joinLobby, leaveLobby, resetLobby } = useRoom();
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [selectedCat, setSelectedCat] = useState(null);
  const [subcatCards, setSubcatCards] = useState([]);
  const [subcatRight, setSubcatRight] = useState([]);
  const [subcatDone, setSubcatDone] = useState(false);
  const [placeCards, setPlaceCards] = useState([]);
  const [placeRight, setPlaceRight] = useState([]);
  const [placeSwipesLeft, setPlaceSwipesLeft] = useState(MAX_PLACE_SWIPES);
  const [placeDone, setPlaceDone] = useState(false);
  const [finalSel, setFinalSel] = useState([]);
  const [timerLeft, setTimerLeft] = useState(FINAL_VOTE_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);

  const room = roomState || newRoom();
  const testMode = room.isTestMode === true;
  const liveLobbyPlayers = getLobbyDisplayPlayers(room, lobby.players);
  const displayPlayers = room.phase === "lobby" ? liveLobbyPlayers : room.players;

  const resetLocalUi = useCallback(() => {
    clearInterval(timerRef.current);
    setMe(null);
    setNameInput("");
    setPinInput("");
    setJoinError("");
    setSelectedCat(null);
    setSubcatCards([]);
    setSubcatRight([]);
    setSubcatDone(false);
    setPlaceCards([]);
    setPlaceRight([]);
    setPlaceSwipesLeft(MAX_PLACE_SWIPES);
    setPlaceDone(false);
    setFinalSel([]);
    setTimerLeft(FINAL_VOTE_SECONDS);
    setSubmitted(false);
  }, []);

  useEffect(() => {
    if (!lobby.wasReset) return;
    const timeoutId = window.setTimeout(() => {
      resetLocalUi();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [lobby.wasReset, lobby.resetVersion, resetLocalUi]);

  useEffect(() => {
    return () => {
      void leaveLobby();
    };
  }, [leaveLobby]);

  const update = useCallback(async (fn) => {
    await updateRoom((current) => {
      const state = current && Object.keys(current).length > 0 ? current : newRoom();
      return fn(state);
    });
  }, [updateRoom]);

  const simulateTestVotes = async (phase) => {
    const automatedPlayers = getAutomatedPlayers(room, me);

    if (automatedPlayers.length === 0) return;

    if (phase === "category") {
      await update((r) => {
        const opts = r.categoryOptions;
        automatedPlayers.forEach((n) => { if (!r.categoryVotes[n] && r.players.includes(n)) r.categoryVotes[n] = opts[Math.random() < 0.5 ? 0 : Math.floor(Math.random() * opts.length)]; });
        return { ...r };
      });
    } else if (phase === "subcat") {
      await update((r) => {
        automatedPlayers.forEach((n) => {
          if (!r.subcatSwipes[n] && r.players.includes(n)) {
            const subcats = SUBCATEGORIES[r.winningCategory];
            const allIds = []; Object.values(subcats || {}).forEach((items) => items.forEach((it) => allIds.push(it.id)));
            r.subcatSwipes[n] = { done: true, right: allIds.filter(() => Math.random() > 0.4) };
          }
        });
        return { ...r };
      });
    } else if (phase === "place") {
      await update((r) => {
        automatedPlayers.forEach((n) => {
          if (!r.placeSwipes[n] && r.players.includes(n)) {
            const catPlaces = ALL_PLACES.filter((p) => p.cat === r.winningCategory);
            r.placeSwipes[n] = { done: true, right: catPlaces.sort(() => Math.random() - 0.5).slice(0, MAX_PLACE_SWIPES).map((p) => p.id) };
          }
        });
        return { ...r };
      });
    } else if (phase === "final") {
      await update((r) => {
        automatedPlayers.forEach((n) => {
          if (!r.finalVotes[n] && r.players.includes(n)) {
            r.finalVotes[n] = r.finalOptions.sort(() => Math.random() - 0.5).slice(0, Math.min(r.finalMaxSelections, r.finalOptions.length));
          }
        });
        return { ...r };
      });
    }
  };

  async function doFinalSubmit() {
    if (submitted) return;
    setSubmitted(true);
    await update((r) => { r.finalVotes[me] = finalSel; return { ...r }; });
    if (testMode) setTimeout(() => simulateTestVotes("final"), 600);
  }

  useEffect(() => {
    if (room?.phase !== "final_vote" || !room?.finalVoteEndTime) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((room.finalVoteEndTime - Date.now()) / 1000));
      setTimerLeft(left);
      if (left <= 0) { clearInterval(timerRef.current); if (!submitted) doFinalSubmit(); }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [room?.phase, room?.finalVoteEndTime, submitted]);

  const handleJoin = async () => {
    const name = nameInput.trim();
    const pin = pinInput.trim();
    if (!name || !pin) return;

    try {
      setJoinError("");
      await joinLobby({ name, pin });
      setMe(name);
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join room.");
    }
  };

  const fillTestPlayers = async () => {
    await update((r) => {
      const actualPlayers = lobby.players.map((player) => player.name);
      const syntheticPlayers = TEST_NAMES
        .filter((name) => !actualPlayers.includes(name))
        .slice(0, Math.max(0, MAX_PLAYERS - actualPlayers.length));

      return {
        ...r,
        isTestMode: syntheticPlayers.length > 0,
        testPlayers: syntheticPlayers,
      };
    });
  };

  const handleStart = async () => {
    if (displayPlayers.length !== MAX_PLAYERS) return;
    await update((r) => ({
      ...r,
      players: displayPlayers,
      phase: "category_vote",
      categoryVotes: {},
      categoryShowResults: false,
    }));
  };

  const handleCatVote = async () => {
    if (!selectedCat) return;
    await update((r) => { r.categoryVotes[me] = selectedCat; return { ...r }; });
    if (testMode) setTimeout(() => simulateTestVotes("category"), 600);
  };

  const handleCatReveal = async () => { await update((r) => ({ ...r, categoryShowResults: true })); };

  function initPlaceCards(cat, rightSubcats) {
    let filtered = ALL_PLACES.filter((p) => p.cat === cat);
    if (rightSubcats && rightSubcats.length > 0) filtered = filtered.filter((p) => p.tags.length === 0 || p.tags.some((t) => rightSubcats.includes(t)));
    setPlaceCards(filtered.sort(() => Math.random() - 0.5));
    setPlaceRight([]); setPlaceSwipesLeft(MAX_PLACE_SWIPES); setPlaceDone(false);
  }

  const handleCatProceed = async () => {
    const r = room;
    const counts = {}; r.categoryOptions.forEach((c) => { counts[c] = 0; });
    Object.values(r.categoryVotes).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = sorted[0][1];
    if (max >= 3) {
      const winner = sorted[0][0];
      await update((rm) => ({ ...rm, winningCategory: winner, phase: winner === "activity" ? "place_swipe" : "subcat_swipe", subcatSwipes: {}, placeSwipes: {} }));
      if (winner !== "activity") {
        setSubcatCards(buildSubcatCards(winner));
        setSubcatRight([]);
        setSubcatDone(false);
      } else {
        initPlaceCards(winner, []);
      }
    } else {
      const topCount = sorted[0][1];
      const tops = sorted.filter(([, c]) => c === topCount).map(([id]) => id);
      const revoteOpts = tops.length >= 2 ? tops : sorted.slice(0, 2).map(([id]) => id);
      await update((rm) => ({ ...rm, categoryOptions: revoteOpts, categoryVotes: {}, categoryShowResults: false, round: rm.round + 1, phase: "category_vote" }));
    }
    setSelectedCat(null);
  };

  const buildSubcatCards = (cat) => {
    const sc = SUBCATEGORIES[cat]; if (!sc) return [];
    const cards = []; Object.entries(sc).forEach(([gk, items]) => items.forEach((it) => cards.push({ ...it, group: gk }))); return cards;
  };

  // Non-host path: populate subcat cards when phase arrives via Realtime.
  // ONLY initializes — never checks for completion.
  useEffect(() => {
    if (room?.phase === "subcat_swipe" && room?.winningCategory && !subcatDone && subcatCards.length === 0) {
      setSubcatCards(buildSubcatCards(room.winningCategory));
      setSubcatRight([]);
    }
  }, [room?.phase, room?.winningCategory]);

  const handleSubcatSwipe = (dir, card) => {
    const rights = dir === "right" ? [...subcatRight, card.id] : [...subcatRight];
    if (dir === "right") setSubcatRight(rights);
    setSubcatCards((prev) => {
      const next = prev.slice(1);
      if (next.length === 0) {
        setSubcatDone(true);
        update((r) => { r.subcatSwipes[me] = { done: true, right: rights }; return { ...r }; });
        if (testMode) setTimeout(() => simulateTestVotes("subcat"), 600);
      }
      return next;
    });
  };

  useEffect(() => {
    if (room?.phase !== "subcat_swipe") return;
    const allDone = room.players.every((p) => room.subcatSwipes[p]?.done);
    if (allDone && room.players.length === MAX_PLAYERS) {
      const allR = new Set(); Object.values(room.subcatSwipes).forEach((s) => s.right?.forEach((id) => allR.add(id)));
      update((r) => ({ ...r, phase: "place_swipe", placeSwipes: {} }));
      initPlaceCards(room.winningCategory, Array.from(allR));
    }
  }, [room?.subcatSwipes, room?.phase]);

  // Non-host path: populate place cards when phase arrives via Realtime.
  // ONLY initializes — never checks for completion.
  useEffect(() => {
    if (room?.phase === "place_swipe" && room?.winningCategory && !placeDone && placeCards.length === 0) {
      const allR = new Set();
      if (room.subcatSwipes) Object.values(room.subcatSwipes).forEach((s) => s.right?.forEach((id) => allR.add(id)));
      initPlaceCards(room.winningCategory, Array.from(allR));
    }
  }, [room?.phase, room?.winningCategory]);

  const handlePlaceSwipe = (dir, card) => {
    const newRight = dir === "right" ? [...placeRight, card.id] : [...placeRight];
    if (dir === "right") setPlaceRight(newRight);
    const newSwipesLeft = dir === "right" ? placeSwipesLeft - 1 : placeSwipesLeft;
    if (dir === "right") setPlaceSwipesLeft(newSwipesLeft);
    setPlaceCards((prev) => {
      const next = prev.slice(1);
      if (next.length === 0 || newSwipesLeft <= 0) {
        setPlaceDone(true);
        update((r) => { r.placeSwipes[me] = { done: true, right: newRight }; return { ...r }; });
        if (testMode) setTimeout(() => simulateTestVotes("place"), 600);
      }
      return next;
    });
  };

  useEffect(() => {
    if (room?.phase !== "place_swipe") return;
    const allDone = room.players.every((p) => room.placeSwipes[p]?.done);
    if (allDone && room.players.length === MAX_PLAYERS) {
      const union = new Set(); Object.values(room.placeSwipes).forEach((s) => s.right?.forEach((id) => union.add(id)));
      const opts = Array.from(union);
      update((r) => ({ ...r, phase: "final_vote", finalOptions: opts, finalVotes: {}, finalMaxSelections: Math.min(4, opts.length), finalVoteEndTime: Date.now() + FINAL_VOTE_SECONDS * 1000, finalRound: 1, finalShowResults: false }));
      setFinalSel([]); setSubmitted(false); setTimerLeft(FINAL_VOTE_SECONDS);
    }
  }, [room?.placeSwipes, room?.phase]);

  const toggleFinal = (id) => {
    if (submitted) return;
    setFinalSel((p) => { if (p.includes(id)) return p.filter((x) => x !== id); if (p.length >= (room?.finalMaxSelections || 4)) return p; return [...p, id]; });
  };

  useEffect(() => {
    if (room?.phase !== "final_vote") return;
    const allVoted = room.players.every((p) => room.finalVotes[p] !== undefined);
    if (allVoted && !room.finalShowResults) update((r) => ({ ...r, finalShowResults: true }));
  }, [room?.finalVotes, room?.phase]);

  const handleFinalProceed = async () => {
    const counts = {}; room.finalOptions.forEach((id) => { counts[id] = { c: 0, v: [] }; });
    Object.entries(room.finalVotes).forEach(([p, sels]) => { sels.forEach((id) => { if (counts[id]) { counts[id].c++; counts[id].v.push(p); } }); });
    const sorted = Object.entries(counts).sort((a, b) => b[1].c - a[1].c);
    const maxV = sorted[0]?.[1].c || 0;
    const with5 = sorted.filter(([, d]) => d.c === 5);
    if (with5.length === 1) {
      await update((rm) => ({ ...rm, phase: "decided", decidedPlace: with5[0][0] }));
    } else if (with5.length > 1) {
      await update((rm) => ({ ...rm, finalOptions: with5.map(([id]) => id), finalVotes: {}, finalMaxSelections: 1, finalVoteEndTime: Date.now() + FINAL_VOTE_SECONDS * 1000, finalRound: rm.finalRound + 1, finalShowResults: false }));
      setFinalSel([]); setSubmitted(false); setTimerLeft(FINAL_VOTE_SECONDS);
    } else {
      const topCount = maxV;
      const tops = sorted.filter(([, d]) => d.c === topCount).map(([id]) => id);
      await update((rm) => ({ ...rm, finalOptions: tops, finalVotes: {}, finalMaxSelections: Math.max(1, tops.length - 1), finalVoteEndTime: Date.now() + FINAL_VOTE_SECONDS * 1000, finalRound: rm.finalRound + 1, finalShowResults: false }));
      setFinalSel([]); setSubmitted(false); setTimerLeft(FINAL_VOTE_SECONDS);
    }
  };

  const handleReset = async () => {
    await update(() => newRoom());

    try {
      await resetLobby();
    } catch (error) {
      console.error("Failed to reset lobby presence.", error);
    }

    resetLocalUi();
  };

  if (loading) return (<div className="app grain" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><div className="waiting-dots"><span /><span /><span /></div></div>);

  const isHost = displayPlayers[0] === me;

  // JOIN
  if (!me) return (
    <div className="app grain">
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="fade-up" style={{ textAlign: "center", width: "100%", maxWidth: 340 }}>
          <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: 100, background: "var(--gd)", color: "var(--gold)", fontSize: 11, fontWeight: 600, letterSpacing: 3, marginBottom: 20 }}>MARCH 20–22</div>
          <h1 className="syne" style={{ fontSize: 64, fontWeight: 800, lineHeight: .95, letterSpacing: -3, marginBottom: 4, background: "linear-gradient(135deg, #fff 30%, var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>DUBAI</h1>
          <p style={{ color: "var(--td)", fontSize: 16, letterSpacing: 2, marginBottom: 40 }}>WEEKEND</p>
          <Dots players={displayPlayers} max={MAX_PLAYERS} />
          <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 12, marginBottom: 32 }}>{displayPlayers.length}/{MAX_PLAYERS} joined{displayPlayers.length > 0 && ` · ${displayPlayers.join(", ")}`}</p>
          {displayPlayers.length < MAX_PLAYERS ? (
            <>
              <input value={nameInput} onChange={(e) => { setNameInput(e.target.value); setJoinError(""); }} onKeyDown={(e) => e.key === "Enter" && handleJoin()} placeholder="Enter your name" style={{ width: "100%", padding: "16px 20px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 16, fontFamily: "'Outfit',sans-serif", outline: "none", textAlign: "center", marginBottom: 12 }} />
              <input value={pinInput} onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 3)); setJoinError(""); }} onKeyDown={(e) => e.key === "Enter" && handleJoin()} placeholder="3-digit PIN" inputMode="numeric" maxLength={3} style={{ width: "100%", padding: "16px 20px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 16, fontFamily: "'Outfit',sans-serif", outline: "none", textAlign: "center", letterSpacing: 4, marginBottom: 12 }} />
              <button onClick={handleJoin} style={{ width: "100%", padding: 16, borderRadius: 14, background: nameInput.trim() && pinInput.trim().length === 3 ? "var(--gold)" : "var(--s)", border: "none", color: nameInput.trim() && pinInput.trim().length === 3 ? "#07070c" : "var(--tm)", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: nameInput.trim() && pinInput.trim().length === 3 ? "pointer" : "not-allowed" }}>Join Room</button>
              {joinError && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{joinError}</p>}
            </>
          ) : (<p style={{ color: "var(--gold)", fontWeight: 600, fontSize: 14 }}>Room is full!</p>)}
        </div>
      </div>
    </div>
  );

  // LOBBY
  if (room.phase === "lobby") {
    const canStart = displayPlayers.length === MAX_PLAYERS;
    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <h2 className="syne fade-up" style={{ fontSize: 28, marginBottom: 8 }}>Waiting Room</h2>
          <p className="fade-up s1" style={{ color: "var(--td)", marginBottom: 32 }}>{displayPlayers.length}/{MAX_PLAYERS} players</p>
          <Dots players={displayPlayers} max={MAX_PLAYERS} />
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {displayPlayers.map((p, i) => (
              <div key={p} className={`fade-up s${i + 1}`} style={{ padding: "12px 16px", borderRadius: 12, background: p === me ? "var(--gd)" : "var(--s)", border: `1px solid ${p === me ? "rgba(240,168,48,0.3)" : "var(--b)"}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: p === me ? "var(--gold)" : "var(--sh)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: p === me ? "#07070c" : "var(--t)" }}>{p.charAt(0).toUpperCase()}</div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{p}</span>
                {i === 0 && <Crown size={14} style={{ color: "var(--gold)", marginLeft: "auto" }} />}
                {p === me && <span style={{ marginLeft: i === 0 ? 4 : "auto", fontSize: 11, color: "var(--td)" }}>(you)</span>}
              </div>
            ))}
          </div>
          {isHost && !canStart && (<button onClick={fillTestPlayers} style={{ width: "100%", marginTop: 16, padding: 12, borderRadius: 12, background: "var(--redd)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--red)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🧪 Fill with test players</button>)}
          {isHost && (<button onClick={canStart ? handleStart : undefined} style={{ width: "100%", marginTop: 16, padding: 16, borderRadius: 14, background: canStart ? "var(--gold)" : "var(--s)", border: "none", color: canStart ? "#07070c" : "var(--tm)", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: canStart ? "pointer" : "not-allowed" }}>{canStart ? "Start →" : `Need ${MAX_PLAYERS - displayPlayers.length} more`}</button>)}
          {!isHost && <Waiting message="Waiting for host..." sub="Hang tight" />}
        </div>
      </div>
    );
  }

  // CATEGORY VOTE
  if (room.phase === "category_vote" && !room.categoryShowResults) {
    const myVote = room.categoryVotes[me]; const allVoted = room.players.every((p) => room.categoryVotes[p]); const votedCount = Object.keys(room.categoryVotes).length;
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

  // CATEGORY RESULTS
  if (room.phase === "category_vote" && room.categoryShowResults) {
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

  // SUBCAT SWIPE
  if (room.phase === "subcat_swipe") {
    const myDone = room.subcatSwipes[me]?.done; const cat = CATEGORIES.find((c) => c.id === room.winningCategory);
    if (myDone) { const dc = room.players.filter((p) => room.subcatSwipes[p]?.done).length; return (<div className="app grain">{testMode && <div className="test-banner">TEST MODE</div>}<Waiting message="Nice picks! 🎯" sub={`${dc}/${room.players.length} done swiping`} players={room.players.filter((p) => room.subcatSwipes[p]?.done)} max={room.players.length} /></div>); }
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

  // PLACE SWIPE
  if (room.phase === "place_swipe") {
    const myDone = room.placeSwipes[me]?.done; const cat = CATEGORIES.find((c) => c.id === room.winningCategory);
    if (myDone) { const dc = room.players.filter((p) => room.placeSwipes[p]?.done).length; return (<div className="app grain">{testMode && <div className="test-banner">TEST MODE</div>}<Waiting message="Picks locked in! 🔒" sub={`${dc}/${room.players.length} done`} players={room.players.filter((p) => room.placeSwipes[p]?.done)} max={room.players.length} /></div>); }
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

  // FINAL VOTE
  if (room.phase === "final_vote") {
    if (room.finalShowResults) {
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
    const mySubmitted = room.finalVotes[me] !== undefined; const subCount = Object.keys(room.finalVotes).length; const urgent = timerLeft <= 10;
    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div><p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 2 }}>ROUND {room.finalRound}</p><h2 className="syne" style={{ fontSize: 22 }}>Final Vote</h2><p style={{ color: "var(--td)", fontSize: 13 }}>Pick up to {room.finalMaxSelections} · {subCount}/{room.players.length} voted</p></div>
            <div className="timer-ring" style={{ color: urgent ? "var(--red)" : "var(--t)", animation: urgent ? "timer-pulse .5s infinite" : "none", textShadow: urgent ? "0 0 20px currentColor" : "none" }}>{timerLeft}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {room.finalOptions.map((pid) => { const place = ALL_PLACES.find((p) => p.id === pid); if (!place) return null; const isSel = finalSel.includes(pid); const atMax = finalSel.length >= room.finalMaxSelections; const dis = mySubmitted || (!isSel && atMax);
              return (<div key={pid} className={`final-option ${isSel ? "sel" : ""} ${dis && !isSel ? "dis" : ""}`} onClick={() => !dis && toggleFinal(pid)}>
                <span style={{ fontSize: 28 }}>{place.img}</span>
                <div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{place.name}</p><p style={{ color: "var(--td)", fontSize: 12 }}>{place.vibe}</p></div>
                {isSel && (<div className="bounce-in" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={16} color="#07070c" /></div>)}
              </div>);
            })}
          </div>
          <span style={{ fontSize: 13, color: "var(--td)" }}>{finalSel.length}/{room.finalMaxSelections} selected</span>
          {!mySubmitted ? (<button onClick={doFinalSubmit} style={{ width: "100%", marginTop: 12, padding: 16, borderRadius: 14, background: finalSel.length > 0 ? "var(--gold)" : "var(--s)", border: "none", color: finalSel.length > 0 ? "#07070c" : "var(--tm)", fontSize: 16, fontWeight: 700, fontFamily: "'Syne',sans-serif", cursor: "pointer" }}>{finalSel.length > 0 ? "Submit Vote" : "Skip (0 votes)"}</button>
          ) : (<p style={{ textAlign: "center", color: "var(--green)", fontWeight: 600, fontSize: 14, padding: "12px 0" }}>✓ Submitted — waiting for others</p>)}
        </div>
      </div>
    );
  }

  // DECIDED
  if (room.phase === "decided") {
    const place = ALL_PLACES.find((p) => p.id === room.decidedPlace); const cat = CATEGORIES.find((c) => c.id === place?.cat);
    return (
      <div className="app grain">
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <div className="bounce-in" style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--gd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 24, border: "2px solid rgba(240,168,48,0.3)" }}>{place?.img || "🎉"}</div>
          <p className="fade-up s1" style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 3, marginBottom: 8 }}>IT'S DECIDED</p>
          <h1 className="syne fade-up s2" style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{place?.name}</h1>
          <p className="fade-up s3" style={{ color: "var(--td)", fontSize: 15, marginBottom: 4 }}>{place?.vibe}</p>
          <div className="fade-up s4" style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 40 }}>
            <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--gd)", color: "var(--gold)", fontSize: 13, fontWeight: 700 }}>{"$".repeat(place?.cost || 1)}</span>
            <span style={{ padding: "6px 14px", borderRadius: 8, background: cat ? `${cat.color}22` : "var(--s)", color: cat?.color, fontSize: 13, fontWeight: 600 }}>{cat?.emoji} {cat?.label}</span>
            {place?.rating && <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--sh)", color: "var(--td)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Star size={12} /> {place.rating}</span>}
          </div>
          <button onClick={handleReset} style={{ padding: "14px 32px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 14, fontWeight: 600, fontFamily: "'Syne',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><RotateCcw size={16} /> New Round</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app grain"><div style={{ padding: 32, textAlign: "center" }}><p>Phase: {room.phase}</p><button onClick={handleReset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, background: "var(--gold)", border: "none", color: "#07070c", fontWeight: 700, cursor: "pointer" }}>Reset</button></div></div>
  );
}
