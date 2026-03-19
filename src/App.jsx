import { useState, useEffect, useCallback, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { useRoom } from "./hooks/useRoom.js";
import {
  MAX_PLAYERS, MAX_PLACE_SWIPES, FINAL_VOTE_SECONDS, TEST_NAMES,
  CATEGORIES, SUBCATEGORIES, ALL_PLACES, newRoom,
} from "./data/places.js";
import JoinScreen from "./screens/JoinScreen.jsx";
import LobbyScreen from "./screens/LobbyScreen.jsx";
import { CategoryVoteScreen, CategoryResultsScreen } from "./screens/CategoryVoteScreen.jsx";
import SubcatSwipeScreen from "./screens/SubcatSwipeScreen.jsx";
import PlaceSwipeScreen from "./screens/PlaceSwipeScreen.jsx";
import { FinalVoteScreen, FinalResultsScreen } from "./screens/FinalVoteScreen.jsx";
import DecidedScreen from "./screens/DecidedScreen.jsx";
import RouletteScreen from "./screens/RouletteScreen.jsx";
import TimelineScreen from "./screens/TimelineScreen.jsx";
import "./App.css";

export default function App() {
  const { room: roomState, updateRoom, loading } = useRoom();
  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [testMode, setTestMode] = useState(false);
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
  // Overlay screens (roulette/timeline) that sit on top of the decided phase
  const [overlay, setOverlay] = useState(null); // null | "roulette" | "timeline"

  const room = roomState || newRoom();

  // ── Timer for final vote ──────────────────────────────
  useEffect(() => {
    if (room?.phase !== "final_vote" || !room?.finalVoteEndTime) return;
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((room.finalVoteEndTime - Date.now()) / 1000));
      setTimerLeft(left);
      if (left <= 0) { clearInterval(timerRef.current); if (!submitted) doFinalSubmit(); }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [room?.phase, room?.finalVoteEndTime, submitted]);

  // ── Room updater ──────────────────────────────────────
  const update = useCallback(async (fn) => {
    await updateRoom((current) => {
      const state = current && Object.keys(current).length > 0 ? current : newRoom();
      return fn(state);
    });
  }, [updateRoom]);

  // ── Test mode helpers ─────────────────────────────────
  const simulateTestVotes = async (phase) => {
    if (phase === "category") {
      await update((r) => {
        const opts = r.categoryOptions;
        TEST_NAMES.forEach((n) => { if (!r.categoryVotes[n] && r.players.includes(n)) r.categoryVotes[n] = opts[Math.random() < 0.5 ? 0 : Math.floor(Math.random() * opts.length)]; });
        return { ...r };
      });
    } else if (phase === "subcat") {
      await update((r) => {
        TEST_NAMES.forEach((n) => {
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
        TEST_NAMES.forEach((n) => {
          if (!r.placeSwipes[n] && r.players.includes(n)) {
            const catPlaces = ALL_PLACES.filter((p) => p.cat === r.winningCategory);
            r.placeSwipes[n] = { done: true, right: catPlaces.sort(() => Math.random() - 0.5).slice(0, MAX_PLACE_SWIPES).map((p) => p.id) };
          }
        });
        return { ...r };
      });
    } else if (phase === "final") {
      await update((r) => {
        TEST_NAMES.forEach((n) => {
          if (!r.finalVotes[n] && r.players.includes(n)) {
            r.finalVotes[n] = r.finalOptions.sort(() => Math.random() - 0.5).slice(0, Math.min(r.finalMaxSelections, r.finalOptions.length));
          }
        });
        return { ...r };
      });
    }
  };

  // ── Join / lobby handlers ─────────────────────────────
  const handleJoin = async () => {
    const name = nameInput.trim(); if (!name) return;
    await update((r) => {
      if (r.players.length >= MAX_PLAYERS || r.players.includes(name)) return r;
      r.players.push(name); return { ...r };
    });
    setMe(name);
  };

  const fillTestPlayers = async () => {
    setTestMode(true);
    await update((r) => { TEST_NAMES.forEach((n) => { if (!r.players.includes(n) && r.players.length < MAX_PLAYERS) r.players.push(n); }); return { ...r }; });
  };

  const handleStart = async () => { await update((r) => ({ ...r, phase: "category_vote", categoryVotes: {}, categoryShowResults: false })); };

  // ── Category vote handlers ────────────────────────────
  const handleCatVote = async () => {
    if (!selectedCat) return;
    await update((r) => { r.categoryVotes[me] = selectedCat; return { ...r }; });
    if (testMode) setTimeout(() => simulateTestVotes("category"), 600);
  };

  const handleCatReveal = async () => { await update((r) => ({ ...r, categoryShowResults: true })); };

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

  // ── Subcat swipe helpers ──────────────────────────────
  const buildSubcatCards = (cat) => {
    const sc = SUBCATEGORIES[cat]; if (!sc) return [];
    const cards = []; Object.entries(sc).forEach(([gk, items]) => items.forEach((it) => cards.push({ ...it, group: gk }))); return cards;
  };

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

  // ── Place swipe helpers ───────────────────────────────
  const initPlaceCards = (cat, rightSubcats) => {
    let filtered = ALL_PLACES.filter((p) => p.cat === cat);
    if (rightSubcats && rightSubcats.length > 0) filtered = filtered.filter((p) => p.tags.length === 0 || p.tags.some((t) => rightSubcats.includes(t)));
    setPlaceCards(filtered.sort(() => Math.random() - 0.5));
    setPlaceRight([]); setPlaceSwipesLeft(MAX_PLACE_SWIPES); setPlaceDone(false);
  };

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

  // ── Final vote handlers ───────────────────────────────
  const toggleFinal = (id) => {
    if (submitted) return;
    setFinalSel((p) => { if (p.includes(id)) return p.filter((x) => x !== id); if (p.length >= (room?.finalMaxSelections || 4)) return p; return [...p, id]; });
  };

  const doFinalSubmit = async () => {
    if (submitted) return; setSubmitted(true);
    await update((r) => { r.finalVotes[me] = finalSel; return { ...r }; });
    if (testMode) setTimeout(() => simulateTestVotes("final"), 600);
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

  // ── Reset ─────────────────────────────────────────────
  const handleReset = async () => {
    await update(() => newRoom());
    setMe(null); setNameInput(""); setTestMode(false); setSelectedCat(null);
    setSubcatCards([]); setSubcatRight([]); setSubcatDone(false);
    setPlaceCards([]); setPlaceRight([]); setPlaceSwipesLeft(MAX_PLACE_SWIPES); setPlaceDone(false);
    setFinalSel([]); setSubmitted(false); setOverlay(null);
  };

  // ── Loading ───────────────────────────────────────────
  if (loading) return (<div className="app grain" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}><div className="waiting-dots"><span /><span /><span /></div></div>);

  const isHost = room.players[0] === me;

  // ── Overlay screens (roulette / timeline) ─────────────
  if (overlay === "roulette") return <RouletteScreen room={room} onBack={() => setOverlay(null)} />;
  if (overlay === "timeline") return <TimelineScreen room={room} onBack={() => setOverlay(null)} />;

  // ── Phase router ──────────────────────────────────────
  if (!me) return <JoinScreen room={room} nameInput={nameInput} setNameInput={setNameInput} handleJoin={handleJoin} />;

  if (room.phase === "lobby") return <LobbyScreen room={room} me={me} testMode={testMode} isHost={isHost} fillTestPlayers={fillTestPlayers} handleStart={handleStart} />;

  if (room.phase === "category_vote" && !room.categoryShowResults) return <CategoryVoteScreen room={room} me={me} testMode={testMode} isHost={isHost} selectedCat={selectedCat} setSelectedCat={setSelectedCat} handleCatVote={handleCatVote} handleCatReveal={handleCatReveal} />;

  if (room.phase === "category_vote" && room.categoryShowResults) return <CategoryResultsScreen room={room} testMode={testMode} isHost={isHost} handleCatProceed={handleCatProceed} />;

  if (room.phase === "subcat_swipe") return <SubcatSwipeScreen room={room} me={me} testMode={testMode} subcatCards={subcatCards} handleSubcatSwipe={handleSubcatSwipe} />;

  if (room.phase === "place_swipe") return <PlaceSwipeScreen room={room} me={me} testMode={testMode} placeCards={placeCards} placeSwipesLeft={placeSwipesLeft} handlePlaceSwipe={handlePlaceSwipe} />;

  if (room.phase === "final_vote" && room.finalShowResults) return <FinalResultsScreen room={room} testMode={testMode} isHost={isHost} handleFinalProceed={handleFinalProceed} />;

  if (room.phase === "final_vote") return <FinalVoteScreen room={room} me={me} testMode={testMode} finalSel={finalSel} toggleFinal={toggleFinal} doFinalSubmit={doFinalSubmit} submitted={submitted} timerLeft={timerLeft} />;

  if (room.phase === "decided") return <DecidedScreen room={room} isHost={isHost} handleReset={handleReset} onRoulette={() => setOverlay("roulette")} onTimeline={() => setOverlay("timeline")} />;

  // Fallback
  return (
    <div className="app grain"><div style={{ padding: 32, textAlign: "center" }}><p>Phase: {room.phase}</p><button onClick={handleReset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, background: "var(--gold)", border: "none", color: "#07070c", fontWeight: 700, cursor: "pointer" }}><RotateCcw size={16} /> Reset</button></div></div>
  );
}
