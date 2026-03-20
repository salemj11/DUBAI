import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { Check, X, RotateCcw, Crown, Star } from "lucide-react";
import { useRoom } from "./hooks/useRoom.js";
import { useTimeline } from "./hooks/useTimeline.js";
import { fetchPlaceDetails } from "./backend/places.js";
import {
  CATEGORIES,
  SUBCATEGORIES,
  getFeaturedPlaces,
  getPlaceById,
  getSwipeablePlaces,
} from "./data/tripData.js";
import "./App.css";

const MAX_PLAYERS = 5;
const SWIPE_THRESHOLD = 80;
const MAX_PLACE_SWIPES = 5;
const FINAL_VOTE_SECONDS = 60;
const TEST_NAMES = ["Test2", "Test3", "Test4", "Test5"];
const DEFAULT_USER_LOCATION = { lat: 25.2048, lng: 55.2708 };
const FEATURED_PLACES = getFeaturedPlaces().slice(0, 6);

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

function uniqueNames(names) {
  return Array.from(new Set(names.filter((name) => typeof name === "string" && name.trim())));
}

function getLobbyDisplayPlayers(room, lobbyPlayers, me) {
  const actualPlayers = uniqueNames(lobbyPlayers.map((player) => player.name));
  const basePlayers = actualPlayers.length > 0 ? actualPlayers : uniqueNames([me]);

  const syntheticPlayers = getStoredTestPlayers(room)
    .filter((name) => !basePlayers.includes(name))
    .slice(0, Math.max(0, MAX_PLAYERS - basePlayers.length));

  return [...basePlayers, ...syntheticPlayers].slice(0, MAX_PLAYERS);
}

function getAutomatedPlayers(room, me) {
  const testPlayers = new Set(getStoredTestPlayers(room));

  return room.players.filter((player) => player !== me && testPlayers.has(player));
}

function formatDistance(distanceMeters) {
  if (!distanceMeters) return "Near you";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m away`;
  return `${(distanceMeters / 1000).toFixed(1)} km away`;
}

function describeBusyness(currentBusyness) {
  if (typeof currentBusyness !== "number") return null;
  if (currentBusyness >= 80) return { label: "Peak rush", tone: "var(--red)", background: "var(--redd)" };
  if (currentBusyness >= 55) return { label: "Buzzing", tone: "var(--gold)", background: "var(--gd)" };
  return { label: "Easy pace", tone: "var(--green)", background: "var(--grnd)" };
}

function shuffleItems(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function formatTimelineTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Dubai",
  }).format(new Date(value));
}

function getTimelineTone(event) {
  if (event.locked) {
    return { label: "LOCKED", background: "var(--gd)", color: "var(--gold)" };
  }

  if (event.status === "cancelled") {
    return { label: "CANCELLED", background: "var(--redd)", color: "var(--red)" };
  }

  if (event.status === "confirmed") {
    return { label: "CONFIRMED", background: "var(--grnd)", color: "var(--green)" };
  }

  return { label: "PENDING", background: "var(--s)", color: "var(--td)" };
}

function TimelinePanel({ timelineDays, timelineSource, placeDetailsById }) {
  return (
    <div className="timeline-panel fade-up s3">
      <div className="timeline-panel-head">
        <div>
          <p className="timeline-kicker">Weekend Timeline</p>
          <h3 className="syne" style={{ fontSize: 20 }}>Locked anchors first</h3>
        </div>
        <span className={`timeline-source ${timelineSource === "live" ? "live" : "fallback"}`}>
          {timelineSource === "live" ? "LIVE" : "LOCAL"}
        </span>
      </div>
      <div className="timeline-days">
        {timelineDays.map((day) => (
          <div key={day.day} className="timeline-day-card">
            <div style={{ marginBottom: 12 }}>
              <p className="timeline-day-label">{day.shortLabel}</p>
              <p className="timeline-day-sub">{day.label}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {day.events.length > 0 ? day.events.map((event) => {
                const place = event.place;
                const details = place ? placeDetailsById[place.id] : null;
                const tone = getTimelineTone(event);

                return (
                  <div key={event.externalKey || event.id} className="timeline-event-card">
                    <div className="timeline-event-main">
                      <div className="timeline-time">
                        <span>{formatTimelineTime(event.startTime)}</span>
                        <span className="timeline-time-divider" />
                        <span>{formatTimelineTime(event.endTime)}</span>
                      </div>
                      <div className="timeline-event-copy">
                        <p className="timeline-event-title">{event.title}</p>
                        <p className="timeline-event-meta">
                          {details?.formattedAddress || place?.area || "Dubai"}
                        </p>
                      </div>
                    </div>
                    <div className="timeline-event-foot">
                      <span style={{
                        padding: "5px 10px",
                        borderRadius: 999,
                        background: tone.background,
                        color: tone.color,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1.1,
                      }}>
                        {tone.label}
                      </span>
                      {place?.emoji && <span style={{ fontSize: 18 }}>{place.emoji}</span>}
                    </div>
                  </div>
                );
              }) : (
                <div className="timeline-empty">Open window for more chaos.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeaturedPlacesRail({ places, placeDetailsById }) {
  return (
    <div className="featured-panel fade-up s4">
      <div className="timeline-panel-head">
        <div>
          <p className="timeline-kicker">Curated Deck</p>
          <h3 className="syne" style={{ fontSize: 20 }}>The kind of spots in rotation</h3>
        </div>
      </div>
      <div className="featured-grid">
        {places.map((place, index) => {
          const details = placeDetailsById[place.id];
          const category = CATEGORIES.find((item) => item.id === place.cat);

          return (
            <div key={place.id} className={`featured-card card-enter s${Math.min(index + 1, 5)}`}>
              <div className="featured-image-wrap">
                {details?.photoUrl ? (
                  <img className="featured-image" src={details.photoUrl} alt={place.name} />
                ) : (
                  <div className="featured-image-fallback" style={{ background: `${category?.color}18` }}>
                    {place.img}
                  </div>
                )}
                <div className="featured-image-scrim" />
                <span className="featured-badge">{category?.label}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <p className="featured-name">{details?.name || place.name}</p>
                  <p className="featured-meta">{place.area}</p>
                </div>
                <p className="featured-copy">{details?.editorialSummary || place.vibe}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {place.displayTags.slice(0, 2).map((tag) => (
                    <span key={tag} className="featured-chip">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const { timelineDays, timelineSource } = useTimeline();
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
  const [placeDetailsById, setPlaceDetailsById] = useState({});
  const [finalSel, setFinalSel] = useState([]);
  const [timerLeft, setTimerLeft] = useState(FINAL_VOTE_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef(null);

  const room = roomState || newRoom();
  const testMode = room.isTestMode === true;
  const liveLobbyPlayers = getLobbyDisplayPlayers(room, lobby.players, me);
  const displayPlayers = room.phase === "lobby" ? liveLobbyPlayers : room.players;
  const timelinePlaces = timelineDays.flatMap((day) => day.events.map((event) => event.place).filter(Boolean));

  useEffect(() => {
    const placesToHydrate = Array.from(new Map([
      ...FEATURED_PLACES.map((place) => [place.id, place]),
      ...timelinePlaces.map((place) => [place.id, place]),
      ...placeCards.map((place) => [place.id, place]),
      ...(room?.finalOptions || []).map((placeId) => {
        const place = getPlaceById(placeId);
        return place ? [place.id, place] : null;
      }),
      (() => {
        const place = getPlaceById(room?.decidedPlace);
        return place ? [place.id, place] : null;
      })(),
    ].filter(Boolean)).values());
    const missingPlaces = placesToHydrate.filter((place) => !placeDetailsById[place.id]);

    if (missingPlaces.length === 0) return;

    let cancelled = false;

    void Promise.all(
      missingPlaces.map(async (place) => [place.id, await fetchPlaceDetails(place.id, DEFAULT_USER_LOCATION, place)])
    ).then((entries) => {
      if (cancelled) return;

      startTransition(() => {
        setPlaceDetailsById((current) => {
          const next = { ...current };
          entries.forEach(([placeId, details]) => {
            next[placeId] = details;
          });
          return next;
        });
      });
    }).catch((error) => {
      console.error("Failed to load place details.", error);
    });

    return () => {
      cancelled = true;
    };
  }, [placeCards, placeDetailsById, room?.decidedPlace, room?.finalOptions, timelinePlaces]);

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
        const categoryVotes = { ...r.categoryVotes };
        const preferredCategory = categoryVotes[me] ?? opts[0];
        automatedPlayers.forEach((n) => {
          if (!categoryVotes[n] && r.players.includes(n)) {
            categoryVotes[n] = Math.random() < 0.75
              ? preferredCategory
              : opts[Math.floor(Math.random() * opts.length)];
          }
        });
        return { ...r, categoryVotes };
      });
    } else if (phase === "subcat") {
      await update((r) => {
        const subcatSwipes = { ...r.subcatSwipes };
        automatedPlayers.forEach((n) => {
          if (!subcatSwipes[n] && r.players.includes(n)) {
            const subcats = SUBCATEGORIES[r.winningCategory];
            const allIds = []; Object.values(subcats || {}).forEach((items) => items.forEach((it) => allIds.push(it.id)));
            subcatSwipes[n] = { done: true, right: allIds.filter(() => Math.random() > 0.4) };
          }
        });
        return { ...r, subcatSwipes };
      });
    } else if (phase === "place") {
      await update((r) => {
        const placeSwipes = { ...r.placeSwipes };
        const activeTags = new Set();
        if (r.subcatSwipes) {
          Object.values(r.subcatSwipes).forEach((swipe) => swipe.right?.forEach((tag) => activeTags.add(tag)));
        }
        automatedPlayers.forEach((n) => {
          if (!placeSwipes[n] && r.players.includes(n)) {
            const catPlaces = shuffleItems(getSwipeablePlaces(r.winningCategory, Array.from(activeTags)));
            placeSwipes[n] = { done: true, right: catPlaces.slice(0, MAX_PLACE_SWIPES).map((p) => p.id) };
          }
        });
        return { ...r, placeSwipes };
      });
    } else if (phase === "final") {
      await update((r) => {
        const finalVotes = { ...r.finalVotes };
        const preferredChoices = Array.isArray(finalVotes[me]) && finalVotes[me].length > 0
          ? finalVotes[me]
          : r.finalOptions.slice(0, Math.min(r.finalMaxSelections, r.finalOptions.length));
        automatedPlayers.forEach((n) => {
          if (!finalVotes[n] && r.players.includes(n)) {
            finalVotes[n] = preferredChoices.slice(0, Math.min(r.finalMaxSelections, preferredChoices.length));
          }
        });
        return { ...r, finalVotes };
      });
    }
  };

  async function doFinalSubmit() {
    if (submitted) return;
    setSubmitted(true);
    await update((r) => ({
      ...r,
      finalVotes: {
        ...r.finalVotes,
        [me]: finalSel,
      },
    }));
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
      const actualPlayers = uniqueNames([
        ...lobby.players.map((player) => player.name),
        me,
      ]);
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
    await update((r) => ({
      ...r,
      categoryVotes: {
        ...r.categoryVotes,
        [me]: selectedCat,
      },
    }));
    if (testMode) setTimeout(() => simulateTestVotes("category"), 600);
  };

  const handleCatReveal = async () => { await update((r) => ({ ...r, categoryShowResults: true })); };

  function initPlaceCards(cat, rightSubcats) {
    const filtered = getSwipeablePlaces(cat, rightSubcats);
    setPlaceCards(shuffleItems(filtered));
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
      const timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setSubcatCards(buildSubcatCards(room.winningCategory));
          setSubcatRight([]);
        });
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [room?.phase, room?.winningCategory, subcatCards.length, subcatDone]);

  const handleSubcatSwipe = (dir, card) => {
    const rights = dir === "right" ? [...subcatRight, card.id] : [...subcatRight];
    if (dir === "right") setSubcatRight(rights);
    setSubcatCards((prev) => {
      const next = prev.slice(1);
      if (next.length === 0) {
        setSubcatDone(true);
        update((r) => ({
          ...r,
          subcatSwipes: {
            ...r.subcatSwipes,
            [me]: { done: true, right: rights },
          },
        }));
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
      const timeoutId = window.setTimeout(() => {
        initPlaceCards(room.winningCategory, Array.from(allR));
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [room?.phase, room?.players, room?.subcatSwipes, room?.winningCategory, update]);

  // Non-host path: populate place cards when phase arrives via Realtime.
  // ONLY initializes — never checks for completion.
  useEffect(() => {
    if (room?.phase === "place_swipe" && room?.winningCategory && !placeDone && placeCards.length === 0) {
      const allR = new Set();
      if (room.subcatSwipes) Object.values(room.subcatSwipes).forEach((s) => s.right?.forEach((id) => allR.add(id)));
      const timeoutId = window.setTimeout(() => {
        initPlaceCards(room.winningCategory, Array.from(allR));
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [placeCards.length, placeDone, room?.phase, room?.subcatSwipes, room?.winningCategory]);

  const handlePlaceSwipe = (dir, card) => {
    const newRight = dir === "right" ? [...placeRight, card.id] : [...placeRight];
    if (dir === "right") setPlaceRight(newRight);
    const newSwipesLeft = dir === "right" ? placeSwipesLeft - 1 : placeSwipesLeft;
    if (dir === "right") setPlaceSwipesLeft(newSwipesLeft);
    setPlaceCards((prev) => {
      const next = prev.slice(1);
      if (next.length === 0 || newSwipesLeft <= 0) {
        setPlaceDone(true);
        update((r) => ({
          ...r,
          placeSwipes: {
            ...r.placeSwipes,
            [me]: { done: true, right: newRight },
          },
        }));
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
      const timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setFinalSel([]);
          setSubmitted(false);
          setTimerLeft(FINAL_VOTE_SECONDS);
        });
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [room?.phase, room?.placeSwipes, room?.players, update]);

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
        <div style={{ padding: "28px 20px 40px", textAlign: "center" }}>
          <div className="lobby-hero fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ textAlign: "left" }}>
                <p className="timeline-kicker">Room Lobby</p>
                <h2 className="syne" style={{ fontSize: 30, marginBottom: 8 }}>Weekend control room</h2>
                <p style={{ color: "var(--td)", fontSize: 14, lineHeight: 1.5 }}>
                  Locked plans are already pinned. Fill with bots if you want to stress-test the full loop solo.
                </p>
              </div>
              <div className="lobby-count-chip">{displayPlayers.length}/{MAX_PLAYERS}</div>
            </div>
          </div>
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
          <TimelinePanel timelineDays={timelineDays} timelineSource={timelineSource} placeDetailsById={placeDetailsById} />
          <FeaturedPlacesRail places={FEATURED_PLACES} placeDetailsById={placeDetailsById} />
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
                <span style={{ padding: "4px 14px", borderRadius: 100, background: "var(--sh)", color: "var(--td)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>{card.group === "cuisine" ? "Cuisine" : card.group === "location" ? "Area" : card.group === "type" ? "Type" : card.group === "vibe" ? "Vibe" : card.group}</span>
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
                {(() => {
                  const details = placeDetailsById[place.id];
                  const busyness = describeBusyness(details?.currentBusyness);
                  return (
                    <>
                      <div>
                        <div style={{ width: "100%", height: 170, borderRadius: 16, overflow: "hidden", background: `linear-gradient(135deg, ${cat?.color}22, ${cat?.color}08)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, marginBottom: 16, position: "relative" }}>
                          {details?.photoUrl ? (
                            <img
                              src={details.photoUrl}
                              alt={place.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span>{place.img}</span>
                          )}
                          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,7,12,0.05), rgba(7,7,12,0.55))" }} />
                          <div style={{ position: "absolute", left: 14, top: 14, padding: "6px 10px", borderRadius: 999, background: "rgba(7,7,12,0.68)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: 1.2 }}>{cat?.label}</div>
                        </div>
                        <h3 className="syne" style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{details?.name || place.name}</h3>
                        <p style={{ color: "var(--td)", fontSize: 14, lineHeight: 1.5, marginBottom: 10 }}>{details?.editorialSummary || place.vibe}</p>
                        {details?.formattedAddress && <p style={{ color: "#cfcfcf", fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}>{details.formattedAddress}</p>}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ padding: "6px 12px", borderRadius: 8, background: "var(--gd)", color: "var(--gold)", fontSize: 14, fontWeight: 700 }}>{"$".repeat(details?.priceLevel || place.cost)}</span>
                        <span style={{ padding: "6px 12px", borderRadius: 8, background: "var(--sh)", color: "var(--td)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Star size={12} /> {(details?.rating || place.rating).toFixed(1)}</span>
                        <span style={{ padding: "6px 12px", borderRadius: 8, background: "var(--s)", color: "#c9c9c9", fontSize: 12 }}>{formatDistance(details?.distanceMeters)}</span>
                        {busyness && <span style={{ padding: "6px 12px", borderRadius: 8, background: busyness.background, color: busyness.tone, fontSize: 12, fontWeight: 700 }}>{busyness.label}</span>}
                        {place.displayTags?.map((tag) => (<span key={tag} style={{ padding: "6px 12px", borderRadius: 8, background: "var(--s)", color: "#aaa", fontSize: 12 }}>{tag}</span>))}
                        {details?.topDishes?.slice(0, 2).map((dish) => (
                          <span key={dish} style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", color: "#d6d6d6", fontSize: 12 }}>{dish}</span>
                        ))}
                      </div>
                    </>
                  );
                })()}
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
            {sorted.map(([id, data]) => { const place = getPlaceById(id); const pct = (data.c / room.players.length) * 100;
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
            {room.finalOptions.map((pid) => { const place = getPlaceById(pid); if (!place) return null; const details = placeDetailsById[pid]; const busyness = describeBusyness(details?.currentBusyness); const isSel = finalSel.includes(pid); const atMax = finalSel.length >= room.finalMaxSelections; const dis = mySubmitted || (!isSel && atMax);
              return (<div key={pid} className={`final-option ${isSel ? "sel" : ""} ${dis && !isSel ? "dis" : ""}`} onClick={() => !dis && toggleFinal(pid)}>
                {details?.photoUrl ? (
                  <img
                    src={details.photoUrl}
                    alt={place.name}
                    style={{ width: 56, height: 56, borderRadius: 16, objectFit: "cover", flexShrink: 0 }}
                  />
                ) : (
                  <span style={{ fontSize: 28 }}>{place.img}</span>
                )}
                <div style={{ flex: 1 }}><p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{details?.name || place.name}</p><p style={{ color: "var(--td)", fontSize: 12, marginBottom: 6 }}>{details?.editorialSummary || place.vibe}</p><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><span style={{ color: "var(--td)", fontSize: 11 }}>{formatDistance(details?.distanceMeters)}</span>{typeof details?.rating === "number" && <span style={{ color: "var(--td)", fontSize: 11 }}>★ {details.rating.toFixed(1)}</span>}{busyness && <span style={{ color: busyness.tone, fontSize: 11, fontWeight: 700 }}>{busyness.label}</span>}</div></div>
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
    const place = getPlaceById(room.decidedPlace); const details = place ? placeDetailsById[place.id] : null; const busyness = describeBusyness(details?.currentBusyness); const cat = CATEGORIES.find((c) => c.id === place?.cat);
    return (
      <div className="app grain">
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          {details?.photoUrl ? (
            <div className="bounce-in" style={{ width: "100%", maxWidth: 360, height: 240, borderRadius: 26, overflow: "hidden", marginBottom: 24, position: "relative", border: "1px solid var(--bl)" }}>
              <img src={details.photoUrl} alt={place?.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(7,7,12,0.05), rgba(7,7,12,0.4))" }} />
            </div>
          ) : (
            <div className="bounce-in" style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--gd)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, marginBottom: 24, border: "2px solid rgba(240,168,48,0.3)" }}>{place?.img || "🎉"}</div>
          )}
          <p className="fade-up s1" style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 3, marginBottom: 8 }}>IT'S DECIDED</p>
          <h1 className="syne fade-up s2" style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{details?.name || place?.name}</h1>
          <p className="fade-up s3" style={{ color: "var(--td)", fontSize: 15, marginBottom: 4 }}>{details?.editorialSummary || place?.vibe}</p>
          {details?.formattedAddress && <p className="fade-up s3" style={{ color: "#cfcfcf", fontSize: 13, marginTop: 8 }}>{details.formattedAddress}</p>}
          {details?.openingHoursSummary && <p className="fade-up s4" style={{ color: "var(--tm)", fontSize: 12, marginTop: 6 }}>{details.openingHoursSummary}</p>}
          <div className="fade-up s4" style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 40 }}>
            <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--gd)", color: "var(--gold)", fontSize: 13, fontWeight: 700 }}>{"$".repeat(details?.priceLevel || place?.cost || 1)}</span>
            <span style={{ padding: "6px 14px", borderRadius: 8, background: cat ? `${cat.color}22` : "var(--s)", color: cat?.color, fontSize: 13, fontWeight: 600 }}>{cat?.emoji} {cat?.label}</span>
            {typeof details?.rating === "number" && <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--sh)", color: "var(--td)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Star size={12} /> {details.rating.toFixed(1)}</span>}
            {details?.distanceMeters && <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--s)", color: "#d7d7d7", fontSize: 13 }}>{formatDistance(details.distanceMeters)}</span>}
            {busyness && <span style={{ padding: "6px 14px", borderRadius: 8, background: busyness.background, color: busyness.tone, fontSize: 13, fontWeight: 700 }}>{busyness.label}</span>}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {details?.googleMapsUri && (
              <a
                href={details.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                style={{ padding: "14px 24px", borderRadius: 14, background: "var(--gold)", color: "#07070c", fontSize: 14, fontWeight: 700, fontFamily: "'Syne',sans-serif", textDecoration: "none" }}
              >
                Open In Maps
              </a>
            )}
            <button onClick={handleReset} style={{ padding: "14px 32px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 14, fontWeight: 600, fontFamily: "'Syne',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}><RotateCcw size={16} /> New Round</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app grain"><div style={{ padding: 32, textAlign: "center" }}><p>Phase: {room.phase}</p><button onClick={handleReset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, background: "var(--gold)", border: "none", color: "#07070c", fontWeight: 700, cursor: "pointer" }}>Reset</button></div></div>
  );
}
