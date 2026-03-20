import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  MapPin,
  Navigation,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useRoom } from "./hooks/useRoom.js";
import { useTimeline } from "./hooks/useTimeline.js";
import { fetchPlaceDetails } from "./backend/places.js";
import { listCustomPlaces, submitCustomPlaceSuggestion } from "./backend/customPlaces.js";
import {
  getAllPlaces,
  CATEGORIES,
  SUBCATEGORIES,
  TRIP_DAYS,
  getPlaceById,
  getPlacesByCategory,
  getSwipeablePlaces,
  getTimelineBrowsePlaces,
  getTimelineDays,
} from "./data/tripData.js";
import {
  createEmptyTimelineDraft,
  createNewRoom,
  createTimelineEventDraft,
  FINAL_VOTE_SECONDS,
  getMajorityCount,
  getTimelineVoteSummary,
  getUnanimousCount,
  MAX_PLACE_SWIPES,
  MAX_PLAYERS,
  mergeTimelineCollections,
  normalizeRoomState,
  normalizeTimelineEvents,
  pruneRoomStateForPlayers,
} from "./lib/roomState.js";
import "./App.css";

const SWIPE_THRESHOLD = 80;
const TEST_NAMES = ["Test2", "Test3", "Test4", "Test5"];
const DEFAULT_USER_LOCATION = { lat: 25.1024, lng: 55.1495 };

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

function getAutomatedPlayers(room, me, roster = room.players) {
  const rosterSet = new Set(Array.isArray(roster) ? roster : []);
  const testPlayers = new Set(getStoredTestPlayers(room));

  return Array.from(rosterSet).filter((player) => player !== me && testPlayers.has(player));
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

function getPhaseLabel(phase) {
  switch (phase) {
    case "lobby":
      return "Lobby open";
    case "category_vote":
      return "Category vote";
    case "subcat_swipe":
      return "Subcategory swipe";
    case "place_swipe":
      return "Place swipe";
    case "final_vote":
      return "Final vote";
    case "roulette_spin":
      return "Roulette spin";
    case "decided":
      return "Decided";
    default:
      return "Live";
  }
}

function flattenSubcategoryOptions(category) {
  const sections = SUBCATEGORIES[category] ?? {};

  return Object.entries(sections).flatMap(([group, items]) =>
    items.map((item) => ({ ...item, group }))
  );
}

function toggleSelection(items, itemId) {
  return items.includes(itemId)
    ? items.filter((value) => value !== itemId)
    : [...items, itemId];
}

function getTimelineSubcategoryOptions(categories) {
  const merged = new Map();

  (Array.isArray(categories) ? categories : []).forEach((categoryId) => {
    flattenSubcategoryOptions(categoryId).forEach((item) => {
      const existing = merged.get(item.id);

      if (existing) {
        existing.categoryIds = uniqueNames([...existing.categoryIds, categoryId]);
        return;
      }

      merged.set(item.id, {
        ...item,
        categoryIds: [categoryId],
      });
    });
  });

  return Array.from(merged.values());
}

function getPlacePhotoUrls(details) {
  if (Array.isArray(details?.photoUrls) && details.photoUrls.length > 0) {
    return details.photoUrls.filter(Boolean);
  }

  if (details?.photoUrl) {
    return [details.photoUrl];
  }

  return [];
}

function buildPlaceMapsUrl(place, details) {
  if (typeof details?.googleMapsUri === "string" && details.googleMapsUri) {
    return details.googleMapsUri;
  }

  const query = place?.googleQuery || [details?.name || place?.name, details?.formattedAddress || place?.area || "Dubai"]
    .filter(Boolean)
    .join(" ");

  if (!query) {
    return null;
  }

  const params = new URLSearchParams({
    api: "1",
    query,
  });

  const rawPlaceId = details?.googlePlaceId || place?.googlePlaceId;
  const normalizedPlaceId = typeof rawPlaceId === "string" && rawPlaceId.includes("/")
    ? rawPlaceId.split("/").pop()
    : rawPlaceId;

  if (typeof normalizedPlaceId === "string" && normalizedPlaceId.startsWith("ChI")) {
    params.set("query_place_id", normalizedPlaceId);
  }

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function PlacePhotoCarousel({
  photos,
  fallback,
  alt,
  badge,
  height = 170,
  radius = 18,
  className = "",
}) {
  const safePhotos = Array.isArray(photos) ? photos.filter(Boolean) : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const hasPhotos = safePhotos.length > 0;
  const canCycle = safePhotos.length > 1;

  const showPrevious = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((current) => (current - 1 + safePhotos.length) % safePhotos.length);
  };

  const showNext = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveIndex((current) => (current + 1) % safePhotos.length);
  };

  return (
    <div
      className={`place-carousel ${className}`.trim()}
      style={{ height, borderRadius: radius }}
    >
      {hasPhotos ? (
        <img
          className="place-carousel-image"
          src={safePhotos[activeIndex]}
          alt={alt}
        />
      ) : (
        <div className="place-carousel-fallback">
          {fallback}
        </div>
      )}
      <div className="place-carousel-scrim" />
      {badge && <span className="place-carousel-badge">{badge}</span>}
      {canCycle && (
        <>
          <button type="button" className="place-carousel-nav left" onClick={showPrevious} aria-label={`Previous photo for ${alt}`}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" className="place-carousel-nav right" onClick={showNext} aria-label={`Next photo for ${alt}`}>
            <ChevronRight size={14} />
          </button>
          <div className="place-carousel-dots">
            {safePhotos.map((photoUrl, index) => (
              <button
                key={`${alt}-${index}`}
                type="button"
                className={`place-carousel-dot ${index === activeIndex ? "active" : ""}`}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setActiveIndex(index);
                }}
                aria-label={`Photo ${index + 1} for ${alt}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PlaceDetailChips({ place, details, compact = false }) {
  const busyness = describeBusyness(details?.currentBusyness);
  const visibleTags = Array.isArray(place.displayTags)
    ? place.displayTags.slice(0, compact ? 2 : 3)
    : [];
  const visibleDishes = Array.isArray(details?.topDishes)
    ? details.topDishes.slice(0, compact ? 1 : 2)
    : [];

  return (
    <div className={`place-chip-row ${compact ? "compact" : ""}`}>
      <span className="place-chip accent">
        {"$".repeat(Math.max(1, details?.priceLevel || place.cost || 1))}
      </span>
      {typeof details?.rating === "number" && (
        <span className="place-chip subtle">
          <Star size={12} />
          {details.rating.toFixed(1)}
        </span>
      )}
      <span className="place-chip subtle">{formatDistance(details?.distanceMeters)}</span>
      {busyness && (
        <span className="place-chip" style={{ background: busyness.background, color: busyness.tone }}>
          {busyness.label}
        </span>
      )}
      {visibleTags.map((tag) => (
        <span key={tag} className="place-chip subtle">
          {tag}
        </span>
      ))}
      {visibleDishes.map((dish) => (
        <span key={dish} className="place-chip subtle">
          {dish}
        </span>
      ))}
    </div>
  );
}

function PlaceBrowseCard({ place, details, selected, onClick, mapsUrl }) {
  const category = CATEGORIES.find((item) => item.id === place.cat);

  return (
    <div
      role="button"
      tabIndex={0}
      className={`browse-place-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
    >
      <PlacePhotoCarousel
        photos={getPlacePhotoUrls(details)}
        fallback={place.img}
        alt={place.name}
        badge={category?.label}
        height={220}
        radius={20}
      />
      <div className="browse-place-copy">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="browse-place-link"
                onClick={(event) => event.stopPropagation()}
              >
                {details?.name || place.name}
              </a>
            ) : (
              <p className="browse-place-title">{details?.name || place.name}</p>
            )}
            <p className="browse-place-meta">{details?.formattedAddress || place.area}</p>
          </div>
          {selected && (
            <div className="composer-place-check">
              <Check size={14} color="#07070c" />
            </div>
          )}
        </div>
        <p className="browse-place-description">{details?.editorialSummary || place.vibe}</p>
        <PlaceDetailChips place={place} details={details} />
      </div>
    </div>
  );
}

function Dots({ players, max }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
      {Array.from({ length: max }).map((_, index) => {
        const player = players[index];

        return (
          <div
            key={index}
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: player ? "var(--sh)" : "var(--s)",
              border: `2px solid ${player ? "var(--bl)" : "var(--b)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              color: player ? "var(--t)" : "var(--tm)",
              transition: "all .3s",
            }}
          >
            {player ? player.charAt(0).toUpperCase() : "?"}
          </div>
        );
      })}
    </div>
  );
}

function Waiting({ message, sub, players, max }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div className="waiting-dots" style={{ marginBottom: 24 }}>
        <span />
        <span />
        <span />
      </div>
      <h2 className="syne" style={{ fontSize: 22, marginBottom: 8 }}>{message}</h2>
      <p style={{ color: "var(--td)", fontSize: 14, marginBottom: 24 }}>{sub}</p>
      {players && <Dots players={players} max={max || MAX_PLAYERS} />}
    </div>
  );
}

function NoticeBanner({ notice, onClick, onClose }) {
  if (!notice) return null;

  return (
    <button
      type="button"
      className={`notice-banner ${notice.tone || "neutral"}`}
      onClick={onClick}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, textAlign: "left" }}>
        <span className="notice-kicker">{notice.kicker || "Live update"}</span>
        <span className="notice-copy">{notice.message}</span>
      </div>
      <span
        role="presentation"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="notice-close"
      >
        <X size={14} />
      </span>
    </button>
  );
}

function TimelinePreviewPanel({ timelineDays, timelineSource, placeDetailsById }) {
  const sourceLabel = timelineSource === "live" ? "LIVE" : timelineSource === "hybrid" ? "SYNC" : "LOCAL";

  return (
    <div className="timeline-panel fade-up s3">
      <div className="timeline-panel-head">
        <div>
          <p className="timeline-kicker">Weekend Timeline</p>
          <h3 className="syne" style={{ fontSize: 20 }}>Locked anchors first</h3>
        </div>
        <span className={`timeline-source ${timelineSource === "live" || timelineSource === "hybrid" ? "live" : "fallback"}`}>
          {sourceLabel}
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
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: 999,
                          background: tone.background,
                          color: tone.color,
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: 1.1,
                        }}
                      >
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

function FeaturedPlacesRail({ places, placeDetailsById, selectedCategory, onSelectCategory }) {
  return (
    <div className="featured-panel fade-up s4">
      <div className="timeline-panel-head">
        <div>
          <p className="timeline-kicker">Curated Deck</p>
          <h3 className="syne" style={{ fontSize: 20 }}>The kind of spots in rotation</h3>
        </div>
      </div>
      <div className="featured-filter-row">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`featured-filter-btn ${selectedCategory === category.id ? "active" : ""}`}
            onClick={() => onSelectCategory(category.id)}
          >
            <span>{category.emoji}</span>
            {category.label}
          </button>
        ))}
      </div>
      <div className="featured-grid">
        {places.map((place, index) => {
          const details = placeDetailsById[place.id];
          const category = CATEGORIES.find((item) => item.id === place.cat);

          return (
            <div key={place.id} className={`featured-card card-enter s${Math.min(index + 1, 5)}`}>
              <PlacePhotoCarousel
                photos={getPlacePhotoUrls(details)}
                fallback={place.img}
                alt={place.name}
                badge={category?.label}
                height={190}
                radius={18}
                className="featured-image-wrap"
              />
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

function MenuActionCard({ icon, title, copy, meta, onClick, accent, badge }) {
  return (
    <button type="button" className="menu-action-card" onClick={onClick}>
      <div className="menu-action-head">
        <div
          className="menu-action-icon"
          style={{ background: `${accent}18`, color: accent }}
        >
          {icon}
        </div>
        {badge && <span className="menu-action-badge">{badge}</span>}
      </div>
      <div style={{ textAlign: "left" }}>
        <p className="menu-action-title">{title}</p>
        <p className="menu-action-copy">{copy}</p>
      </div>
      <p className="menu-action-meta">{meta}</p>
    </button>
  );
}

function TimelineWorkspace({
  day,
  timelineSource,
  placeDetailsById,
  me,
  isHost,
  rosterCount,
  unreadTimelineCount,
  highlightedEventId,
  onBack,
  onPrevDay,
  onNextDay,
  onAddEvent,
  onDeleteEvent,
  onVoteEvent,
  bindEventRef,
}) {
  return (
    <div className="app grain">
      <div style={{ padding: "22px 20px 120px" }}>
        <div className="timeline-workspace-header fade-up">
          <button type="button" className="ghost-chip" onClick={onBack}>
            <ChevronLeft size={16} />
            Menu
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {unreadTimelineCount > 0 && (
              <span className="menu-action-badge">{unreadTimelineCount} new</span>
            )}
            <span className={`timeline-source ${timelineSource === "live" || timelineSource === "hybrid" ? "live" : "fallback"}`}>
              {timelineSource === "live" ? "LIVE" : timelineSource === "hybrid" ? "SYNC" : "LOCAL"}
            </span>
          </div>
        </div>

        <div className="timeline-navigator fade-up s1">
          <button type="button" className="timeline-nav-btn" onClick={onPrevDay}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ textAlign: "center" }}>
            <p className="timeline-kicker">Weekend Plans</p>
            <h2 className="syne" style={{ fontSize: 28 }}>{day.shortLabel}</h2>
            <p style={{ color: "var(--td)", fontSize: 13, marginTop: 4 }}>{day.label}</p>
          </div>
          <button type="button" className="timeline-nav-btn" onClick={onNextDay}>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="timeline-info-card fade-up s2">
          <p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>
            EVENT RULES
          </p>
          <p style={{ color: "#d7d7d7", fontSize: 13, lineHeight: 1.6 }}>
            New events auto-vote you in with a yes. They confirm at 3/5 yes votes and auto-cancel if
            they are still below 3 yes votes within one hour of the start time.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {day.events.length > 0 ? day.events.map((event) => {
            const details = event.place ? placeDetailsById[event.place.id] : null;
            const tone = getTimelineTone(event);
            const myVote = event.votes?.[me];
            const summary = getTimelineVoteSummary(event, rosterCount);
            const eventKey = event.externalKey || event.id;
            const canDelete = !event.locked && (isHost || event.createdBy === me);

            return (
              <div
                key={eventKey}
                ref={(node) => bindEventRef(eventKey, node)}
                className={`timeline-event-detail fade-up s3 ${highlightedEventId === eventKey ? "highlighted" : ""}`}
              >
                <div className="timeline-event-detail-top">
                  <div className="timeline-time">
                    <span>{formatTimelineTime(event.startTime)}</span>
                    <span className="timeline-time-divider" />
                    <span>{formatTimelineTime(event.endTime)}</span>
                  </div>
                  <div className="timeline-event-actions">
                    <span
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: tone.background,
                        color: tone.color,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1,
                      }}
                    >
                      {tone.label}
                    </span>
                    {canDelete && (
                      <button
                        type="button"
                        className="timeline-inline-action danger"
                        onClick={() => onDeleteEvent(eventKey)}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
                  <PlacePhotoCarousel
                    photos={getPlacePhotoUrls(details)}
                    fallback={event.place?.emoji || "📍"}
                    alt={event.title}
                    height={92}
                    radius={18}
                    className="timeline-event-media"
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="timeline-event-title">{event.title}</p>
                    <p className="timeline-event-meta" style={{ marginTop: 6 }}>
                      {details?.formattedAddress || event.place?.area || "Dubai"}
                    </p>
                    <p className="timeline-event-meta" style={{ marginTop: 6 }}>
                      Added by {event.createdBy}
                    </p>
                    {event.notes && (
                      <p className="timeline-event-meta" style={{ marginTop: 8, color: "#cfcfcf" }}>
                        {event.notes}
                      </p>
                    )}
                    {event.place && (
                      <div style={{ marginTop: 12 }}>
                        <PlaceDetailChips place={event.place} details={details} compact />
                      </div>
                    )}
                  </div>
                </div>

                {!event.locked && (
                  <div className="timeline-vote-bar-wrap">
                    <div className="timeline-vote-summary">
                      <span>{summary.submittedCount}/{summary.targetCount} submitted</span>
                      <span>{summary.yesCount}/{summary.requiredYesCount} yes</span>
                    </div>
                    {event.status === "pending" ? (
                      <div className="timeline-vote-actions">
                        <button
                          type="button"
                          className={`timeline-vote-btn yes ${myVote === "yes" ? "selected" : ""}`}
                          onClick={() => onVoteEvent(eventKey, "yes")}
                        >
                          <Check size={16} />
                          Yes
                        </button>
                        <button
                          type="button"
                          className={`timeline-vote-btn no ${myVote === "no" ? "selected" : ""}`}
                          onClick={() => onVoteEvent(eventKey, "no")}
                        >
                          <X size={16} />
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="timeline-vote-lock">{event.status === "confirmed" ? "Added to plans" : "This event closed before enough yes votes came in."}</div>
                    )}
                  </div>
                )}
              </div>
            );
          }) : (
            <div className="timeline-empty fade-up s3">Nothing on this day yet. Tap + to add something.</div>
          )}
        </div>
      </div>

      <button type="button" className="timeline-add-fab" onClick={onAddEvent}>
        <Plus size={20} />
      </button>
    </div>
  );
}

function TimelineComposer({
  open,
  draft,
  placeDetailsById,
  onClose,
  onChangeTime,
  onToggleCategory,
  onToggleSubcategory,
  onSelectPlace,
  onBackStep,
  onContinueFromTime,
  onContinueFromCategory,
  onContinueFromSubcategory,
  onViewAllPlaces,
  onCreate,
}) {
  if (!open) return null;

  const selectedCategories = Array.isArray(draft.categories)
    ? draft.categories
    : (draft.category ? [draft.category] : []);
  const selectedSubcategories = Array.isArray(draft.subcategories)
    ? draft.subcategories
    : (draft.subcategory ? [draft.subcategory] : []);
  const subcategoryOptions = getTimelineSubcategoryOptions(selectedCategories);
  const placeOptions = getTimelineBrowsePlaces(selectedCategories, selectedSubcategories);
  const activeDay = TRIP_DAYS.find((day) => day.day === draft.day) ?? TRIP_DAYS[0];
  const stepTitles = {
    time: "Pick a start time",
    category: "Select categories",
    subcategory: "Narrow the vibe",
    place: "Browse matching places",
  };
  const canContinueCategory = selectedCategories.length > 0;
  const canContinueSubcategory = selectedCategories.length > 0;

  return (
    <div className="composer-overlay">
      <div className="composer-sheet fade-up">
        <div className="composer-header">
          <div style={{ flex: 1 }}>
            <p className="timeline-kicker">Add Event</p>
            <h3 className="syne" style={{ fontSize: 26 }}>
              {stepTitles[draft.step]}
            </h3>
            {draft.step !== "time" && (
              <p className="composer-subcopy">
                Use the same stacked selection flow as the game, then pick one card to drop onto the timeline.
              </p>
            )}
          </div>
          <div className="composer-header-actions">
            {draft.step !== "time" && (
              <button type="button" className="ghost-chip" onClick={onBackStep}>
                <ChevronLeft size={14} />
                Back
              </button>
            )}
            <button type="button" className="ghost-chip" onClick={onClose}>
              <X size={14} />
              Close
            </button>
          </div>
        </div>

        <div className="composer-progress">
          {["time", "category", "subcategory", "place"].map((step) => (
            <div key={step} className={`composer-progress-dot ${draft.step === step ? "active" : ""}`} />
          ))}
        </div>

        {draft.step === "time" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="timeline-info-card">
              <p style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>
                {activeDay.label}
              </p>
              <p style={{ color: "#d8d8d8", fontSize: 13, lineHeight: 1.6 }}>
                For now every user-added event is one hour long. If it still has fewer than 3 yes votes when it gets within one hour of starting, the app cancels it automatically.
              </p>
            </div>
            <input
              type="time"
              value={draft.time}
              onChange={(event) => onChangeTime(event.target.value)}
              className="composer-time-input"
            />
            <button type="button" className="solid-action" onClick={onContinueFromTime}>
              Continue
            </button>
          </div>
        )}

        {draft.step === "category" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`cat-btn ${selectedCategories.includes(category.id) ? "selected" : ""}`}
                onClick={() => onToggleCategory(category.id)}
              >
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    background: `${category.color}22`,
                    flexShrink: 0,
                  }}
                >
                  {category.emoji}
                </span>
                <span>{category.label}</span>
                {selectedCategories.includes(category.id) && <Check size={20} style={{ marginLeft: "auto", color: "var(--green)" }} />}
              </button>
            ))}
            <div className="composer-selection-row">
              {selectedCategories.map((categoryId) => {
                const category = CATEGORIES.find((item) => item.id === categoryId);

                if (!category) return null;

                return (
                  <span key={categoryId} className="composer-pill">
                    {category.emoji} {category.label}
                  </span>
                );
              })}
            </div>
            <button
              type="button"
              className="solid-action"
              disabled={!canContinueCategory}
              onClick={onContinueFromCategory}
            >
              Continue to filters
            </button>
            <button type="button" className="ghost-chip composer-view-all" onClick={onViewAllPlaces}>
              <Sparkles size={14} />
              View all available places
            </button>
          </div>
        )}

        {draft.step === "subcategory" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {subcategoryOptions.length > 0 ? (
              <div className="composer-grid">
                {subcategoryOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`composer-choice ${selectedSubcategories.includes(item.id) ? "selected" : ""}`}
                    onClick={() => onToggleSubcategory(item.id)}
                  >
                    <span style={{ fontSize: 28 }}>{item.emoji}</span>
                    <span style={{ fontWeight: 700 }}>{item.label}</span>
                    <span style={{ color: "var(--td)", fontSize: 12, textTransform: "capitalize" }}>{item.group}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="timeline-empty">No extra filters for these categories. Go straight to the place cards.</div>
            )}
            <div className="composer-selection-row">
              {selectedSubcategories.length > 0 ? selectedSubcategories.map((subcategoryId) => {
                const option = subcategoryOptions.find((item) => item.id === subcategoryId);
                return option ? (
                  <span key={subcategoryId} className="composer-pill">
                    {option.emoji} {option.label}
                  </span>
                ) : null;
              }) : (
                <span className="composer-hint">No filter selected means show every place in the chosen categories.</span>
              )}
            </div>
            <button
              type="button"
              className="solid-action"
              disabled={!canContinueSubcategory}
              onClick={onContinueFromSubcategory}
            >
              Show place cards
            </button>
          </div>
        )}

        {draft.step === "place" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="composer-selection-row">
              {selectedCategories.map((categoryId) => {
                const category = CATEGORIES.find((item) => item.id === categoryId);

                return category ? (
                  <span key={categoryId} className="composer-pill">
                    {category.emoji} {category.label}
                  </span>
                ) : null;
              })}
              {selectedSubcategories.map((subcategoryId) => {
                const option = subcategoryOptions.find((item) => item.id === subcategoryId);
                return option ? (
                  <span key={subcategoryId} className="composer-pill subdued">
                    {option.emoji} {option.label}
                  </span>
                ) : null;
              })}
            </div>
            {placeOptions.length > 0 ? placeOptions.map((place) => {
              const details = placeDetailsById[place.id];
              const active = draft.placeId === place.id;

              return (
                <PlaceBrowseCard
                  key={place.id}
                  place={place}
                  details={details}
                  selected={active}
                  onClick={() => onSelectPlace(place.id)}
                />
              );
            }) : (
              <div className="timeline-empty">No places matched those filters. Go back and loosen the selection.</div>
            )}
            <button
              type="button"
              className="solid-action"
              onClick={onCreate}
              disabled={!draft.placeId}
            >
              Add To Timeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PlacesLibrary({
  places,
  placeDetailsById,
  selectedCategory,
  sortBy,
  suggestions,
  onBack,
  onOpenSuggest,
  onSelectCategory,
  onSelectSort,
}) {
  return (
    <div className="app grain">
      <div style={{ padding: "28px 20px 44px" }}>
        <div className="timeline-workspace-header fade-up">
          <button type="button" className="ghost-chip" onClick={onBack}>
            <ChevronLeft size={16} />
            Menu
          </button>
          <button type="button" className="ghost-chip" onClick={onOpenSuggest}>
            <Plus size={16} />
            Suggest place
          </button>
        </div>

        <div className="lobby-hero fade-up">
          <p className="timeline-kicker">All Places</p>
          <h2 className="syne" style={{ fontSize: 30, marginBottom: 8 }}>Everything in the deck</h2>
          <p style={{ color: "var(--td)", fontSize: 14, lineHeight: 1.6 }}>
            Browse the full set without swiping. Use this when you just want to see what is available before voting or adding something to the timeline.
          </p>
        </div>

        <div className="featured-filter-row fade-up s1">
          <button
            type="button"
            className={`featured-filter-btn ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => onSelectCategory("all")}
          >
            <Sparkles size={14} />
            All
          </button>
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`featured-filter-btn ${selectedCategory === category.id ? "active" : ""}`}
              onClick={() => onSelectCategory(category.id)}
            >
              <span>{category.emoji}</span>
              {category.label}
            </button>
          ))}
        </div>

        <div className="featured-filter-row fade-up s1" style={{ marginTop: -4, marginBottom: 18 }}>
          {[
            { id: "distance", label: "Closest to FIVE Palm" },
            { id: "rating", label: "Top rated" },
            { id: "price_desc", label: "Price high-low" },
            { id: "price_asc", label: "Price low-high" },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              className={`featured-filter-btn ${sortBy === option.id ? "active" : ""}`}
              onClick={() => onSelectSort(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="library-stack fade-up s2">
          {places.map((place) => (
            <PlaceBrowseCard
              key={place.id}
              place={place}
              details={placeDetailsById[place.id]}
              selected={false}
              mapsUrl={buildPlaceMapsUrl(place, placeDetailsById[place.id])}
              onClick={() => {
                const mapUrl = buildPlaceMapsUrl(place, placeDetailsById[place.id]);

                if (mapUrl) {
                  window.open(mapUrl, "_blank", "noopener,noreferrer");
                }
              }}
            />
          ))}
        </div>

        <div className="timeline-panel fade-up s3">
          <div className="timeline-panel-head">
            <div>
              <p className="timeline-kicker">User Suggestions</p>
              <h3 className="syne" style={{ fontSize: 20 }}>Saved for future deck updates</h3>
            </div>
          </div>
          <p style={{ color: "var(--td)", fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
            New place ideas get stored in Supabase. On a future pass I can review the pending entries, add the real ones to the main deck, and skip the bad ones without polluting the live cards.
          </p>
          {suggestions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="suggestion-card">
                  <div>
                    <p className="browse-place-title" style={{ fontSize: 16 }}>{suggestion.name}</p>
                    <p className="browse-place-meta">
                      {suggestion.category} {suggestion.area ? `· ${suggestion.area}` : ""} · submitted by {suggestion.submitted_by}
                    </p>
                    {suggestion.notes && <p className="browse-place-description" style={{ marginTop: 8 }}>{suggestion.notes}</p>}
                  </div>
                  <span className={`suggestion-status ${suggestion.status}`}>{suggestion.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="timeline-empty">No saved suggestions yet. Use the button above to add one.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomPlaceComposer({ open, draft, saving, onChange, onClose, onSubmit }) {
  if (!open) return null;

  return (
    <div className="composer-overlay">
      <div className="composer-sheet fade-up">
        <div className="composer-header">
          <div style={{ flex: 1 }}>
            <p className="timeline-kicker">Suggest A Place</p>
            <h3 className="syne" style={{ fontSize: 26 }}>Store a custom idea</h3>
            <p className="composer-subcopy">
              This saves the suggestion to Supabase so I can review it later and add only the real, useful ones to the main deck.
            </p>
          </div>
          <button type="button" className="ghost-chip" onClick={onClose}>
            <X size={14} />
            Close
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Place name"
            className="composer-text-input"
          />
          <div className="composer-grid">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`composer-choice ${draft.category === category.id ? "selected" : ""}`}
                onClick={() => onChange("category", category.id)}
              >
                <span style={{ fontSize: 28 }}>{category.emoji}</span>
                <span style={{ fontWeight: 700 }}>{category.label}</span>
              </button>
            ))}
          </div>
          <input
            type="text"
            value={draft.area}
            onChange={(event) => onChange("area", event.target.value)}
            placeholder="Area / neighbourhood (optional)"
            className="composer-text-input"
          />
          <textarea
            value={draft.notes}
            onChange={(event) => onChange("notes", event.target.value)}
            placeholder="Why it fits the trip, branch name, or anything useful"
            className="composer-textarea"
          />
          <button type="button" className="solid-action" disabled={saving || !draft.name.trim()} onClick={onSubmit}>
            {saving ? "Saving..." : "Save suggestion"}
          </button>
        </div>
      </div>
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
    window.setTimeout(() => {
      onSwipe(dir, cards[0]);
      setExitDir(null);
      setDx(0);
    }, 320);
  };

  const handleStart = (clientX) => {
    setDragging(true);
    startX.current = clientX;
  };

  const handleMove = (clientX) => {
    if (dragging) {
      setDx(clientX - startX.current);
    }
  };

  const handleEnd = () => {
    if (!dragging) return;

    setDragging(false);

    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      const dir = dx > 0 ? "right" : "left";

      if (dir === "right" && maxSwipes && swipesLeft <= 0) {
        setDx(0);
        return;
      }

      doSwipe(dir);
      return;
    }

    setDx(0);
  };

  if (cards.length === 0) return null;

  const rightOp = Math.min(Math.max(dx / SWIPE_THRESHOLD, 0), 1);
  const leftOp = Math.min(Math.max(-dx / SWIPE_THRESHOLD, 0), 1);
  const noSwipes = maxSwipes && swipesLeft <= 0;

  return (
    <div>
      {maxSwipes && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 16 }}>
          {Array.from({ length: maxSwipes }).map((_, index) => (
            <div
              key={index}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: index < swipesLeft ? "var(--green)" : "var(--sh)",
                border: `1px solid ${index < swipesLeft ? "var(--green)" : "var(--b)"}`,
                transition: "all .3s",
              }}
            />
          ))}
          <span style={{ fontSize: 12, color: "var(--td)", marginLeft: 8 }}>
            {swipesLeft} swipe{swipesLeft !== 1 ? "s" : ""} left
          </span>
        </div>
      )}

      <div className="swipe-stack">
        {cards.slice(1, 3).reverse().map((card, index) => {
          const stackIndex = cards.slice(1, 3).length - 1 - index;

          return (
            <div
              key={card.id}
              className="swipe-card"
              style={{
                transform: `scale(${1 - (stackIndex + 1) * 0.04}) translateY(${(stackIndex + 1) * 10}px)`,
                zIndex: 10 - stackIndex - 1,
                background: "var(--bg)",
                border: "1px solid var(--b)",
                overflow: "hidden",
                transition: "transform 0.4s cubic-bezier(0.2, 0, 0, 1)",
              }}
            >
              {renderCard(card)}
            </div>
          );
        })}

        <div
          className="swipe-card"
          style={{
            zIndex: 10,
            transform: exitDir
              ? `translateX(${exitDir === "right" ? "120%" : "-120%"}) rotate(${exitDir === "right" ? 20 : -20}deg)`
              : `translateX(${dx}px) rotate(${dx * 0.05}deg) scale(${1 - Math.abs(dx) * 0.0003})`,
            opacity: exitDir ? 0 : 1,
            transition: dragging
              ? "none"
              : exitDir
                ? "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease-out"
                : "transform 0.5s cubic-bezier(0.2, 0, 0, 1)",
            background: "var(--bg)",
            border: "1px solid var(--b)",
            overflow: "hidden",
            boxShadow: dragging ? "0 12px 40px rgba(0,0,0,0.4)" : "none",
          }}
          onTouchStart={(event) => handleStart(event.touches[0].clientX)}
          onTouchMove={(event) => handleMove(event.touches[0].clientX)}
          onTouchEnd={handleEnd}
          onMouseDown={(event) => handleStart(event.clientX)}
          onMouseMove={(event) => handleMove(event.clientX)}
          onMouseUp={handleEnd}
          onMouseLeave={() => {
            if (dragging) handleEnd();
          }}
        >
          <div
            className={`swipe-overlay-badge yes ${rightOp > 0 ? "visible" : ""}`}
            style={{
              opacity: rightOp,
              transform: `translate3d(${Math.min(dx * 0.08, 24)}px, 0, 0) rotate(-6deg) scale(${0.9 + rightOp * 0.12})`,
            }}
          >
            <Check size={20} />
            <span>{noSwipes ? "MAXED" : "YES"}</span>
          </div>
          <div
            className={`swipe-overlay-badge no ${leftOp > 0 ? "visible" : ""}`}
            style={{
              opacity: leftOp,
              transform: `translate3d(${Math.max(dx * 0.08, -24)}px, 0, 0) rotate(6deg) scale(${0.9 + leftOp * 0.12})`,
            }}
          >
            <X size={20} />
            <span>NO</span>
          </div>
          <div className="swipe-overlay-wash yes" style={{ opacity: rightOp * 0.78 }} />
          <div className="swipe-overlay-wash no" style={{ opacity: leftOp * 0.78 }} />
          {renderCard(cards[0])}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 20 }}>
        <button
          type="button"
          onClick={() => doSwipe("left")}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--redd)",
            border: "2px solid rgba(248,113,113,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--red)",
          }}
        >
          <X size={24} />
        </button>
        <button
          type="button"
          onClick={() => doSwipe("right")}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: noSwipes ? "var(--s)" : "var(--grnd)",
            border: `2px solid ${noSwipes ? "var(--b)" : "rgba(52,211,153,0.3)"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: noSwipes ? "not-allowed" : "pointer",
            color: noSwipes ? "var(--tm)" : "var(--green)",
            opacity: noSwipes ? 0.4 : 1,
          }}
        >
          <Check size={24} />
        </button>
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: "var(--tm)", marginTop: 12 }}>
        {cards.length - 1} more in deck
      </p>
    </div>
  );
}

export default function App() {
  const { room: roomState, lobby, updateRoom, loading, joinLobby, leaveLobby, resetLobby } = useRoom();
  const { timelineEvents: baseTimelineEvents, timelineSource } = useTimeline();

  const [me, setMe] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [activePanel, setActivePanel] = useState("menu");
  const [featuredCategory, setFeaturedCategory] = useState("activity");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [librarySort, setLibrarySort] = useState("distance");
  const [selectedCat, setSelectedCat] = useState(null);
  const [subcatCards, setSubcatCards] = useState([]);
  const [subcatRight, setSubcatRight] = useState([]);
  const [subcatDone, setSubcatDone] = useState(false);
  const [placeCards, setPlaceCards] = useState([]);
  const [placeRight, setPlaceRight] = useState([]);
  const [placeSwipesLeft, setPlaceSwipesLeft] = useState(MAX_PLACE_SWIPES);
  const [placeDone, setPlaceDone] = useState(false);
  const [placeDetailsById, setPlaceDetailsById] = useState({});
  const [userLocation, setUserLocation] = useState(DEFAULT_USER_LOCATION);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [finalSel, setFinalSel] = useState([]);
  const [timerLeft, setTimerLeft] = useState(FINAL_VOTE_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [timelineDayIndex, setTimelineDayIndex] = useState(0);
  const [timelineComposerOpen, setTimelineComposerOpen] = useState(false);
  const [timelineDraft, setTimelineDraft] = useState(() => createEmptyTimelineDraft(TRIP_DAYS[0].day));
  const [highlightedEventId, setHighlightedEventId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [unreadTimelineCount, setUnreadTimelineCount] = useState(0);
  const [rouletteCursor, setRouletteCursor] = useState(0);
  const [customPlaceComposerOpen, setCustomPlaceComposerOpen] = useState(false);
  const [customPlaceSaving, setCustomPlaceSaving] = useState(false);
  const [customPlaceSuggestions, setCustomPlaceSuggestions] = useState([]);
  const [customPlaceDraft, setCustomPlaceDraft] = useState({
    name: "",
    category: "food",
    area: "",
    notes: "",
  });

  const timerRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const eventRefs = useRef(new Map());
  const previousLobbyNamesRef = useRef([]);
  const knownTimelineIdsRef = useRef(new Set());
  const resettingRoomRef = useRef(false);

  const room = normalizeRoomState(roomState || createNewRoom());
  const testMode = room.isTestMode === true;
  const liveLobbyPlayers = getLobbyDisplayPlayers(room, lobby.players, me);
  const displayPlayers = room.phase === "lobby" ? liveLobbyPlayers : room.players;
  const allBrowseablePlaces = getAllPlaces().filter((place) => place.swipeEligible && !place.locked);
  const featuredPlaces = getPlacesByCategory(featuredCategory, { includeLocked: false })
    .filter((place) => place.swipeEligible)
    .slice(0, 6);
  const filteredAvailablePlaces = (
    libraryCategory === "all"
      ? allBrowseablePlaces
      : getPlacesByCategory(libraryCategory, { includeLocked: false })
  ).filter((place) => place.swipeEligible && !place.locked);
  const availablePlaces = [...filteredAvailablePlaces].sort((left, right) => {
    const leftDetails = placeDetailsById[left.id];
    const rightDetails = placeDetailsById[right.id];

    if (librarySort === "rating") {
      return (rightDetails?.rating ?? right.rating ?? 0) - (leftDetails?.rating ?? left.rating ?? 0);
    }

    if (librarySort === "price_desc") {
      return (rightDetails?.priceLevel ?? right.cost ?? 0) - (leftDetails?.priceLevel ?? left.cost ?? 0);
    }

    if (librarySort === "price_asc") {
      return (leftDetails?.priceLevel ?? left.cost ?? 0) - (rightDetails?.priceLevel ?? right.cost ?? 0);
    }

    return (leftDetails?.distanceMeters ?? Number.MAX_SAFE_INTEGER) - (rightDetails?.distanceMeters ?? Number.MAX_SAFE_INTEGER);
  });
  const mergedTimelineEvents = mergeTimelineCollections(baseTimelineEvents, room.timelineEvents, displayPlayers.length);
  const timelineDays = getTimelineDays(mergedTimelineEvents);
  const timelinePlaces = mergedTimelineEvents.map((event) => event.place).filter(Boolean);
  const timelineSourceLabel = room.timelineEvents.length > 0 ? "hybrid" : timelineSource;
  const safeTimelineDayIndex = timelineDays.length === 0
    ? 0
    : Math.min(timelineDayIndex, timelineDays.length - 1);
  const timelineDay = timelineDays[safeTimelineDayIndex] ?? timelineDays[0] ?? { day: TRIP_DAYS[0].day, label: TRIP_DAYS[0].label, shortLabel: TRIP_DAYS[0].shortLabel, events: [] };
  const hostName = room.phase === "lobby" ? liveLobbyPlayers[0] : room.players[0];
  const isHost = hostName === me;
  const isActivePlayer = room.phase === "lobby" || room.players.includes(me);
  const pendingTimelineCount = mergedTimelineEvents.filter((event) => !event.locked && event.status === "pending").length;

  const showNotice = useCallback((nextNotice) => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }

    setNotice({
      id: Date.now(),
      tone: "neutral",
      kicker: "Live update",
      ...nextNotice,
    });

    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
    }, 4200);
  }, []);

  const clearGameplayUi = useCallback((preserveIdentity = false) => {
    window.clearInterval(timerRef.current);
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
    setActivePanel("menu");
    setTimelineComposerOpen(false);
    setTimelineDraft(createEmptyTimelineDraft(TRIP_DAYS[0].day));
    setHighlightedEventId(null);
    setRouletteCursor(0);
    setCustomPlaceComposerOpen(false);
    setCustomPlaceDraft({
      name: "",
      category: "food",
      area: "",
      notes: "",
    });

    if (!preserveIdentity) {
      setMe(null);
      setNameInput("");
      setPinInput("");
      setJoinError("");
      setUnreadTimelineCount(0);
    }
  }, []);

  const update = useCallback(async (fn) => {
    await updateRoom((current) => fn(normalizeRoomState(current && Object.keys(current).length > 0 ? current : createNewRoom())));
  }, [updateRoom]);

  useEffect(() => {
    const placesToHydrate = Array.from(new Map([
      ...featuredPlaces.map((place) => [place.id, place]),
      ...(activePanel === "places" ? availablePlaces.map((place) => [place.id, place]) : []),
      ...timelinePlaces.map((place) => [place.id, place]),
      ...placeCards.map((place) => [place.id, place]),
      ...(room.finalOptions || []).map((placeId) => {
        const place = getPlaceById(placeId);
        return place ? [place.id, place] : null;
      }),
      (() => {
        const place = getPlaceById(room.decidedPlace);
        return place ? [place.id, place] : null;
      })(),
    ].filter(Boolean)).values());
    const missingPlaces = placesToHydrate.filter((place) => !placeDetailsById[place.id]);

    if (missingPlaces.length === 0) return undefined;

    let cancelled = false;

    void Promise.all(
      missingPlaces.map(async (place) => [place.id, await fetchPlaceDetails(place.id, userLocation, place)])
    )
      .then((entries) => {
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
      })
      .catch((error) => {
        console.error("Failed to load place details.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [activePanel, availablePlaces, featuredPlaces, placeCards, placeDetailsById, room.decidedPlace, room.finalOptions, timelinePlaces, userLocation]);

  useEffect(() => {
    if (!me || typeof navigator === "undefined" || !navigator.geolocation || locationStatus !== "idle") {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("ready");
      },
      () => {
        setLocationStatus("fallback");
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  }, [locationStatus, me]);

  useEffect(() => {
    if (!me) {
      setCustomPlaceSuggestions([]);
      return;
    }

    let cancelled = false;

    void listCustomPlaces()
      .then((rows) => {
        if (cancelled) return;
        setCustomPlaceSuggestions(rows);
      })
      .catch((error) => {
        console.warn("Failed to load custom place suggestions.", error);
      });

    return () => {
      cancelled = true;
    };
  }, [me]);

  useEffect(() => {
    if (!lobby.wasReset || resettingRoomRef.current) return;

    const timeoutId = window.setTimeout(() => {
      showNotice({
        tone: "warning",
        kicker: "Room reset",
        message: "Someone cleared the room. Join again to start fresh.",
      });
      clearGameplayUi(false);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [clearGameplayUi, lobby.resetVersion, lobby.wasReset, showNotice]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }

      void leaveLobby();
    };
  }, [leaveLobby]);

  useEffect(() => {
    if (!me) {
      previousLobbyNamesRef.current = uniqueNames(lobby.players.map((player) => player.name));
      return;
    }

    const currentNames = uniqueNames(lobby.players.map((player) => player.name));
    const previousNames = previousLobbyNamesRef.current;
    const joinedNames = currentNames.filter((name) => !previousNames.includes(name));
    const leftNames = previousNames.filter((name) => !currentNames.includes(name));

    joinedNames
      .filter((name) => name !== me)
      .forEach((name) => {
        showNotice({
          tone: "success",
          kicker: "Lobby update",
          message: `${name} joined the room.`,
        });
      });

    leftNames.forEach((name) => {
      showNotice({
        tone: "warning",
        kicker: room.phase === "lobby" ? "Lobby update" : "Player left",
        message: room.phase === "lobby" ? `${name} left the lobby.` : `${name} left mid-game.`,
      });
    });

    previousLobbyNamesRef.current = currentNames;
  }, [lobby.players, me, room.phase, showNotice]);

  useEffect(() => {
    if (!me) {
      knownTimelineIdsRef.current = new Set();
      return;
    }

    const currentIds = new Set(room.timelineEvents.map((event) => event.externalKey || event.id));
    const previousIds = knownTimelineIdsRef.current;
    const newForeignEvent = room.timelineEvents.find((event) => {
      const eventKey = event.externalKey || event.id;

      return !previousIds.has(eventKey) && event.createdBy !== me;
    });

    if (newForeignEvent) {
      const timeoutId = window.setTimeout(() => {
        setUnreadTimelineCount((count) => count + 1);
        showNotice({
          tone: "info",
          kicker: "New event",
          message: `${newForeignEvent.createdBy} added ${newForeignEvent.placeName}. Tap to jump there.`,
          eventId: newForeignEvent.externalKey || newForeignEvent.id,
        });
      }, 0);

      knownTimelineIdsRef.current = currentIds;
      return () => window.clearTimeout(timeoutId);
    }

    knownTimelineIdsRef.current = currentIds;
    return undefined;
  }, [me, room.timelineEvents, showNotice]);

  useEffect(() => {
    if (!highlightedEventId) return undefined;

    const timeoutId = window.setTimeout(() => {
      setHighlightedEventId(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedEventId]);

  useEffect(() => {
    if (!me || !isHost || room.phase === "lobby" || room.players.length === 0) return;

    const liveNames = new Set(lobby.players.map((player) => player.name));

    if (!liveNames.has(me)) return;

    const nextPlayers = room.players.filter((player) => liveNames.has(player) || getStoredTestPlayers(room).includes(player));

    if (nextPlayers.length === room.players.length) return;

    const removedPlayers = room.players.filter((player) => !nextPlayers.includes(player));

    if (nextPlayers.length > 0) {
      void update((current) => pruneRoomStateForPlayers(current, nextPlayers));
    }

    removedPlayers.forEach((player) => {
      showNotice({
        tone: "warning",
        kicker: "Roster updated",
        message: `${player} was removed from the active round after disconnecting.`,
      });
    });
  }, [isHost, lobby.players, me, room, update, showNotice]);

  useEffect(() => {
    if (!me || !isHost) return undefined;

    const syncTimelineStatuses = () => {
      const normalizedEvents = normalizeTimelineEvents(room.timelineEvents, displayPlayers.length);

      if (JSON.stringify(normalizedEvents) === JSON.stringify(room.timelineEvents)) {
        return;
      }

      void update((current) => ({
        ...normalizeRoomState(current),
        timelineEvents: normalizedEvents,
      }));
    };

    syncTimelineStatuses();

    const intervalId = window.setInterval(syncTimelineStatuses, 30000);

    return () => window.clearInterval(intervalId);
  }, [displayPlayers.length, isHost, me, room.timelineEvents, update]);

  useEffect(() => {
    if (room.phase !== "final_vote" || !room.finalVoteEndTime) return undefined;

    timerRef.current = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((room.finalVoteEndTime - Date.now()) / 1000));

      setTimerLeft(left);

      if (left <= 0) {
        window.clearInterval(timerRef.current);
      }
    }, 250);

    return () => window.clearInterval(timerRef.current);
  }, [room.finalVoteEndTime, room.phase]);

  useEffect(() => {
    if (room.phase !== "final_vote" || !room.finalVoteEndTime || submitted) return;

    if (Date.now() >= room.finalVoteEndTime) {
      void (async () => {
        setSubmitted(true);
        await update((current) => ({
          ...current,
          finalVotes: {
            ...current.finalVotes,
            [me]: finalSel,
          },
        }));
      })();
    }
  }, [finalSel, me, room.finalVoteEndTime, room.phase, submitted, update]);

  useEffect(() => {
    if (room.phase !== "final_vote" || !room.finalShowResults || !isHost) return;

    const rouletteCount = room.players.filter((player) => room.rouletteVotes[player]).length;

    if (rouletteCount === room.players.length && room.players.length > 0) {
      void update((current) => ({
        ...current,
        phase: "roulette_spin",
        rouletteOptions: current.finalOptions,
        rouletteStartedAt: Date.now(),
        rouletteWinner: null,
      }));
    }
  }, [isHost, room.finalShowResults, room.phase, room.players, room.rouletteVotes, update]);

  useEffect(() => {
    if (room.phase !== "roulette_spin" || room.rouletteOptions.length === 0) return undefined;

    const intervalId = window.setInterval(() => {
      setRouletteCursor((current) => (current + 1) % room.rouletteOptions.length);
    }, 120);

    let timeoutId = null;

    if (isHost) {
      timeoutId = window.setTimeout(() => {
        const winner = shuffleItems(room.rouletteOptions)[0];

        void update((current) => ({
          ...current,
          rouletteWinner: winner,
          decidedPlace: winner,
          phase: "decided",
        }));
      }, 3400);
    }

    return () => {
      window.clearInterval(intervalId);

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [isHost, room.phase, room.rouletteOptions, update]);

  const bindEventRef = useCallback((eventId, node) => {
    if (node) {
      eventRefs.current.set(eventId, node);
      return;
    }

    eventRefs.current.delete(eventId);
  }, []);

  const jumpToTimelineEvent = useCallback((eventId) => {
    const dayIndex = timelineDays.findIndex((day) =>
      day.events.some((event) => (event.externalKey || event.id) === eventId)
    );

    if (dayIndex >= 0) {
      setTimelineDayIndex(dayIndex);
    }

    setActivePanel("timeline");
    setUnreadTimelineCount(0);

    window.setTimeout(() => {
      const node = eventRefs.current.get(eventId);

      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      setHighlightedEventId(eventId);
    }, 220);
  }, [timelineDays]);

  const handleJoin = async () => {
    const name = nameInput.trim();
    const pin = pinInput.trim();

    if (!name || pin.length !== 3) return;

    try {
      setJoinError("");
      await joinLobby({ name, pin });
      setMe(name);
      setActivePanel("menu");
      setLocationStatus("idle");
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join room.");
    }
  };

  const handleLeaveSession = async () => {
    await leaveLobby();
    clearGameplayUi(false);
  };

  const handleReset = async () => {
    const credentials = me && /^\d{3}$/.test(pinInput)
      ? { name: me, pin: pinInput }
      : null;

    resettingRoomRef.current = true;

    await update(() => createNewRoom());

    try {
      await resetLobby();
    } catch (error) {
      console.error("Failed to reset lobby presence.", error);
    }

    clearGameplayUi(Boolean(credentials));

    if (credentials) {
      try {
        await joinLobby(credentials);
        setMe(credentials.name);
        setActivePanel("menu");
        showNotice({
          tone: "success",
          kicker: "Room reset",
          message: "Fresh lobby is live. Send the link again and start clean.",
        });
      } catch (error) {
        console.error("Failed to rejoin after room reset.", error);
        clearGameplayUi(false);
      }
    }

    resettingRoomRef.current = false;
  };

  const fillTestPlayers = async () => {
    await update((current) => {
      const actualPlayers = uniqueNames([
        ...lobby.players.map((player) => player.name),
        me,
      ]);
      const syntheticPlayers = TEST_NAMES
        .filter((name) => !actualPlayers.includes(name))
        .slice(0, Math.max(0, MAX_PLAYERS - actualPlayers.length));

      return {
        ...current,
        isTestMode: syntheticPlayers.length > 0,
        testPlayers: syntheticPlayers,
      };
    });

    showNotice({
      tone: "success",
      kicker: "Test players ready",
      message: "The lobby is now topped up to 5/5 so you can run the full loop solo.",
    });
  };

  const handleStart = async () => {
    if (displayPlayers.length !== MAX_PLAYERS) return;

    await update((current) => ({
      ...current,
      players: displayPlayers,
      phase: "category_vote",
      categoryVotes: {},
      categoryShowResults: false,
      rouletteVotes: {},
      rouletteOptions: [],
      rouletteWinner: null,
      decidedPlace: null,
    }));
  };

  const simulateTestVotes = async (phase) => {
    const automatedPlayers = getAutomatedPlayers(room, me, room.players);

    if (automatedPlayers.length === 0) return;

    if (phase === "category") {
      await update((current) => {
        const categoryVotes = { ...current.categoryVotes };
        const preferredCategory = categoryVotes[me] ?? current.categoryOptions[0];

        automatedPlayers.forEach((name) => {
          if (!categoryVotes[name] && current.players.includes(name)) {
            categoryVotes[name] = Math.random() < 0.75
              ? preferredCategory
              : current.categoryOptions[Math.floor(Math.random() * current.categoryOptions.length)];
          }
        });

        return { ...current, categoryVotes };
      });
    }

    if (phase === "subcat") {
      await update((current) => {
        const subcatSwipes = { ...current.subcatSwipes };

        automatedPlayers.forEach((name) => {
          if (!subcatSwipes[name] && current.players.includes(name)) {
            const allIds = flattenSubcategoryOptions(current.winningCategory).map((item) => item.id);
            subcatSwipes[name] = {
              done: true,
              right: allIds.filter(() => Math.random() > 0.38),
            };
          }
        });

        return { ...current, subcatSwipes };
      });
    }

    if (phase === "place") {
      await update((current) => {
        const placeSwipes = { ...current.placeSwipes };
        const activeTags = new Set();

        Object.values(current.subcatSwipes).forEach((swipe) => {
          swipe.right?.forEach((tag) => activeTags.add(tag));
        });

        automatedPlayers.forEach((name) => {
          if (!placeSwipes[name] && current.players.includes(name)) {
            const options = shuffleItems(getSwipeablePlaces(current.winningCategory, Array.from(activeTags)));

            placeSwipes[name] = {
              done: true,
              right: options.slice(0, MAX_PLACE_SWIPES).map((place) => place.id),
            };
          }
        });

        return { ...current, placeSwipes };
      });
    }

    if (phase === "final") {
      await update((current) => {
        const finalVotes = { ...current.finalVotes };
        const preferredChoices = Array.isArray(finalVotes[me]) && finalVotes[me].length > 0
          ? finalVotes[me]
          : current.finalOptions.slice(0, Math.min(current.finalMaxSelections, current.finalOptions.length));

        automatedPlayers.forEach((name) => {
          if (!finalVotes[name] && current.players.includes(name)) {
            finalVotes[name] = preferredChoices.slice(0, Math.min(current.finalMaxSelections, preferredChoices.length));
          }
        });

        return { ...current, finalVotes };
      });
    }
  };

  const simulateTestTimelineVotes = async (eventId) => {
    await update((current) => {
      if (getStoredTestPlayers(current).length === 0) {
        return current;
      }

      const timelineEvents = current.timelineEvents.map((event) => {
        const eventKey = event.externalKey || event.id;

        if (eventKey !== eventId || event.locked || event.status !== "pending") {
          return event;
        }

        const nextVotes = { ...event.votes };

        getStoredTestPlayers(current).forEach((name, index) => {
          if (!nextVotes[name]) {
            nextVotes[name] = index < 2 || Math.random() > 0.35 ? "yes" : "no";
          }
        });

        return normalizeTimelineEvents([{ ...event, votes: nextVotes }], displayPlayers.length)[0];
      });

      return {
        ...current,
        timelineEvents,
      };
    });
  };

  async function doFinalSubmit() {
    if (submitted) return;

    setSubmitted(true);
    await update((current) => ({
      ...current,
      finalVotes: {
        ...current.finalVotes,
        [me]: finalSel,
      },
    }));

    if (testMode) {
      window.setTimeout(() => {
        void simulateTestVotes("final");
      }, 600);
    }
  }

  const handleCatVote = async () => {
    if (!selectedCat) return;

    await update((current) => ({
      ...current,
      categoryVotes: {
        ...current.categoryVotes,
        [me]: selectedCat,
      },
    }));

    if (testMode) {
      window.setTimeout(() => {
        void simulateTestVotes("category");
      }, 600);
    }
  };

  const handleCatReveal = async () => {
    await update((current) => ({ ...current, categoryShowResults: true }));
  };

  const buildSubcatCards = (category) => flattenSubcategoryOptions(category);

  const initPlaceCards = (category, rightSubcats) => {
    const filtered = getSwipeablePlaces(category, rightSubcats);
    setPlaceCards(shuffleItems(filtered));
    setPlaceRight([]);
    setPlaceSwipesLeft(MAX_PLACE_SWIPES);
    setPlaceDone(false);
  };

  const handleCatProceed = async () => {
    const counts = {};

    room.categoryOptions.forEach((category) => {
      counts[category] = 0;
    });

    Object.values(room.categoryVotes).forEach((vote) => {
      counts[vote] = (counts[vote] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((left, right) => right[1] - left[1]);
    const majority = getMajorityCount(room.players.length);
    const winner = sorted[0]?.[1] >= majority ? sorted[0][0] : null;

    if (winner) {
      const nextSubcatCards = buildSubcatCards(winner);
      const shouldUseSubcategories = nextSubcatCards.length > 0;

      await update((current) => ({
        ...current,
        winningCategory: winner,
        phase: shouldUseSubcategories ? "subcat_swipe" : "place_swipe",
        subcatSwipes: {},
        placeSwipes: {},
      }));

      if (shouldUseSubcategories) {
        setSubcatCards(nextSubcatCards);
        setSubcatRight([]);
        setSubcatDone(false);
      } else {
        initPlaceCards(winner, []);
      }
    } else {
      const topCount = sorted[0]?.[1] || 0;
      const leaders = sorted.filter(([, count]) => count === topCount).map(([id]) => id);
      const revoteOptions = leaders.length >= 2 ? leaders : sorted.slice(0, 2).map(([id]) => id);

      await update((current) => ({
        ...current,
        categoryOptions: revoteOptions,
        categoryVotes: {},
        categoryShowResults: false,
        round: current.round + 1,
        phase: "category_vote",
      }));
    }

    setSelectedCat(null);
  };

  useEffect(() => {
    if (room.phase === "subcat_swipe" && room.winningCategory && !subcatDone && subcatCards.length === 0) {
      const timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setSubcatCards(buildSubcatCards(room.winningCategory));
          setSubcatRight([]);
        });
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [room.phase, room.winningCategory, subcatCards.length, subcatDone]);

  const handleSubcatSwipe = (dir, card) => {
    const nextRight = dir === "right" ? [...subcatRight, card.id] : [...subcatRight];

    if (dir === "right") {
      setSubcatRight(nextRight);
    }

    setSubcatCards((previous) => {
      const nextCards = previous.slice(1);

      if (nextCards.length === 0) {
        setSubcatDone(true);

        void update((current) => ({
          ...current,
          subcatSwipes: {
            ...current.subcatSwipes,
            [me]: { done: true, right: nextRight },
          },
        }));

        if (testMode) {
          window.setTimeout(() => {
            void simulateTestVotes("subcat");
          }, 600);
        }
      }

      return nextCards;
    });
  };

  useEffect(() => {
    if (room.phase !== "subcat_swipe") return undefined;

    const allDone = room.players.every((player) => room.subcatSwipes[player]?.done);

    if (allDone && room.players.length > 0) {
      const acceptedTags = new Set();

      Object.values(room.subcatSwipes).forEach((swipe) => {
        swipe.right?.forEach((tag) => acceptedTags.add(tag));
      });

      void update((current) => ({
        ...current,
        phase: "place_swipe",
        placeSwipes: {},
      }));

      const timeoutId = window.setTimeout(() => {
        initPlaceCards(room.winningCategory, Array.from(acceptedTags));
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [room.phase, room.players, room.subcatSwipes, room.winningCategory, update]);

  useEffect(() => {
    if (room.phase === "place_swipe" && room.winningCategory && !placeDone && placeCards.length === 0) {
      const activeTags = new Set();

      if (room.subcatSwipes) {
        Object.values(room.subcatSwipes).forEach((swipe) => {
          swipe.right?.forEach((tag) => activeTags.add(tag));
        });
      }

      const timeoutId = window.setTimeout(() => {
        initPlaceCards(room.winningCategory, Array.from(activeTags));
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [placeCards.length, placeDone, room.phase, room.subcatSwipes, room.winningCategory]);

  const handlePlaceSwipe = (dir, card) => {
    const nextRight = dir === "right" ? [...placeRight, card.id] : [...placeRight];
    const nextSwipesLeft = dir === "right" ? placeSwipesLeft - 1 : placeSwipesLeft;

    if (dir === "right") {
      setPlaceRight(nextRight);
      setPlaceSwipesLeft(nextSwipesLeft);
    }

    setPlaceCards((previous) => {
      const nextCards = previous.slice(1);

      if (nextCards.length === 0 || nextSwipesLeft <= 0) {
        setPlaceDone(true);

        void update((current) => ({
          ...current,
          placeSwipes: {
            ...current.placeSwipes,
            [me]: { done: true, right: nextRight },
          },
        }));

        if (testMode) {
          window.setTimeout(() => {
            void simulateTestVotes("place");
          }, 600);
        }
      }

      return nextCards;
    });
  };

  useEffect(() => {
    if (room.phase !== "place_swipe") return undefined;

    const allDone = room.players.every((player) => room.placeSwipes[player]?.done);

    if (allDone && room.players.length > 0) {
      const optionSet = new Set();

      Object.values(room.placeSwipes).forEach((swipe) => {
        swipe.right?.forEach((placeId) => optionSet.add(placeId));
      });

      const options = Array.from(optionSet);

      void update((current) => ({
        ...current,
        phase: "final_vote",
        finalOptions: options,
        finalVotes: {},
        finalMaxSelections: Math.min(4, options.length),
        finalVoteEndTime: Date.now() + FINAL_VOTE_SECONDS * 1000,
        finalRound: 1,
        finalShowResults: false,
        rouletteVotes: {},
      }));

      const timeoutId = window.setTimeout(() => {
        startTransition(() => {
          setFinalSel([]);
          setSubmitted(false);
          setTimerLeft(FINAL_VOTE_SECONDS);
        });
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [room.phase, room.placeSwipes, room.players, update]);

  const toggleFinal = (id) => {
    if (submitted) return;

    setFinalSel((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= (room.finalMaxSelections || 4)) {
        return current;
      }

      return [...current, id];
    });
  };

  useEffect(() => {
    if (room.phase !== "final_vote") return;

    const allVoted = room.players.every((player) => room.finalVotes[player] !== undefined);

    if (allVoted && !room.finalShowResults) {
      void update((current) => ({ ...current, finalShowResults: true }));
    }
  }, [room.finalShowResults, room.finalVotes, room.phase, room.players, update]);

  const handleFinalProceed = async () => {
    const counts = {};

    room.finalOptions.forEach((id) => {
      counts[id] = { c: 0, v: [] };
    });

    Object.entries(room.finalVotes).forEach(([player, selections]) => {
      selections.forEach((id) => {
        if (counts[id]) {
          counts[id].c += 1;
          counts[id].v.push(player);
        }
      });
    });

    if (room.finalOptions.length === 1) {
      await update((current) => ({
        ...current,
        phase: "decided",
        decidedPlace: current.finalOptions[0],
      }));
      return;
    }

    const sorted = Object.entries(counts).sort((left, right) => right[1].c - left[1].c);
    const unanimousCount = getUnanimousCount(room.players.length);
    const unanimityWinners = sorted.filter(([, data]) => data.c === unanimousCount);

    if (unanimityWinners.length === 1) {
      await update((current) => ({
        ...current,
        phase: "decided",
        decidedPlace: unanimityWinners[0][0],
      }));
      return;
    }

    if (unanimityWinners.length > 1) {
      await update((current) => ({
        ...current,
        finalOptions: unanimityWinners.map(([id]) => id),
        finalVotes: {},
        finalMaxSelections: 1,
        finalVoteEndTime: Date.now() + FINAL_VOTE_SECONDS * 1000,
        finalRound: current.finalRound + 1,
        finalShowResults: false,
        rouletteVotes: {},
      }));
      setFinalSel([]);
      setSubmitted(false);
      setTimerLeft(FINAL_VOTE_SECONDS);
      return;
    }

    const topCount = sorted[0]?.[1].c || 0;
    const topOptions = sorted.filter(([, data]) => data.c === topCount).map(([id]) => id);

    await update((current) => ({
      ...current,
      finalOptions: topOptions,
      finalVotes: {},
      finalMaxSelections: Math.max(1, topOptions.length - 1),
      finalVoteEndTime: Date.now() + FINAL_VOTE_SECONDS * 1000,
      finalRound: current.finalRound + 1,
      finalShowResults: false,
      rouletteVotes: {},
    }));
    setFinalSel([]);
    setSubmitted(false);
    setTimerLeft(FINAL_VOTE_SECONDS);
  };

  const voteForRoulette = async () => {
    await update((current) => ({
      ...current,
      rouletteVotes: {
        ...current.rouletteVotes,
        [me]: true,
      },
    }));

    if (testMode) {
      window.setTimeout(() => {
        void update((current) => {
          const rouletteVotes = { ...current.rouletteVotes };

          getAutomatedPlayers(current, me, current.players).forEach((name) => {
            rouletteVotes[name] = true;
          });

          return {
            ...current,
            rouletteVotes,
          };
        });
      }, 500);
    }
  };

  const openTimelineComposer = () => {
    setTimelineDraft(createEmptyTimelineDraft(timelineDay.day));
    setTimelineComposerOpen(true);
  };

  const handleTimelineDraftBack = () => {
    const selectedCategories = Array.isArray(timelineDraft.categories) ? timelineDraft.categories : [];
    const hasSubcategoryStep = getTimelineSubcategoryOptions(selectedCategories).length > 0;

    setTimelineDraft((current) => {
      if (current.step === "place") {
        return {
          ...current,
          step: hasSubcategoryStep ? "subcategory" : "category",
          placeId: null,
        };
      }

      if (current.step === "subcategory") {
        return {
          ...current,
          step: "category",
          subcategories: [],
          subcategory: null,
          placeId: null,
        };
      }

      if (current.step === "category") {
        return {
          ...current,
          step: "time",
        };
      }

      return current;
    });
  };

  const handleViewAllTimelinePlaces = () => {
    setTimelineDraft((current) => ({
      ...current,
      categories: CATEGORIES.map((category) => category.id),
      category: null,
      subcategories: [],
      subcategory: null,
      placeId: null,
      step: "place",
    }));
  };

  const handleCreateTimelineEvent = async () => {
    if (!timelineDraft.placeId || !me) return;
    const selectedPlace = getPlaceById(timelineDraft.placeId);

    const event = createTimelineEventDraft({
      day: timelineDraft.day,
      time: timelineDraft.time,
      category: selectedPlace?.cat ?? timelineDraft.categories?.[0] ?? timelineDraft.category,
      subcategory: selectedPlace?.subcategory ?? timelineDraft.subcategories?.[0] ?? timelineDraft.subcategory,
      placeId: timelineDraft.placeId,
      createdBy: me,
    });

    await update((current) => ({
      ...current,
      timelineEvents: normalizeTimelineEvents([...current.timelineEvents, event], displayPlayers.length),
    }));

    setTimelineComposerOpen(false);
    setTimelineDraft(createEmptyTimelineDraft(timelineDraft.day));
    setTimelineDayIndex(TRIP_DAYS.findIndex((day) => day.day === event.day));
    showNotice({
      tone: "success",
      kicker: "Timeline updated",
      message: `${event.placeName} was added and your yes vote is already counted.`,
      eventId: event.externalKey,
    });

    if (testMode) {
      window.setTimeout(() => {
        void simulateTestTimelineVotes(event.externalKey);
      }, 550);
    }
  };

  const handleDeleteTimelineEvent = async (eventId) => {
    const eventToDelete = mergedTimelineEvents.find((event) => (event.externalKey || event.id) === eventId);

    if (!eventToDelete || eventToDelete.locked) return;
    if (!window.confirm(`Delete ${eventToDelete.placeName} from the timeline?`)) return;

    await update((current) => ({
      ...current,
      timelineEvents: normalizeTimelineEvents(
        current.timelineEvents.filter((event) => (event.externalKey || event.id) !== eventId),
        displayPlayers.length
      ),
    }));

    if (highlightedEventId === eventId) {
      setHighlightedEventId(null);
    }

    showNotice({
      tone: "warning",
      kicker: "Event deleted",
      message: `${eventToDelete.placeName} was removed from the timeline.`,
    });
  };

  const handleVoteTimelineEvent = async (eventId, vote) => {
    await update((current) => ({
      ...current,
      timelineEvents: normalizeTimelineEvents(
        current.timelineEvents.map((event) => {
          const eventKey = event.externalKey || event.id;

          if (eventKey !== eventId || event.locked) {
            return event;
          }

          return {
            ...event,
            votes: {
              ...event.votes,
              [me]: vote,
            },
          };
        }),
        displayPlayers.length
      ),
    }));

    if (testMode) {
      window.setTimeout(() => {
        void simulateTestTimelineVotes(eventId);
      }, 450);
    }
  };

  const handleSubmitCustomPlace = async () => {
    if (!me || !customPlaceDraft.name.trim()) return;

    setCustomPlaceSaving(true);

    try {
      const savedPlace = await submitCustomPlaceSuggestion({
        ...customPlaceDraft,
        submittedBy: me,
      });

      setCustomPlaceSuggestions((current) => [savedPlace, ...current].slice(0, 20));
      setCustomPlaceDraft({
        name: "",
        category: customPlaceDraft.category,
        area: "",
        notes: "",
      });
      setCustomPlaceComposerOpen(false);
      showNotice({
        tone: "success",
        kicker: "Suggestion saved",
        message: `${savedPlace.name} is stored for the next deck review.`,
      });
    } catch (error) {
      console.error("Failed to save custom place suggestion.", error);
      showNotice({
        tone: "warning",
        kicker: "Save failed",
        message: "Custom place storage is unavailable right now. Run the latest Supabase migration and try again.",
      });
    } finally {
      setCustomPlaceSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app grain" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="waiting-dots"><span /><span /><span /></div>
      </div>
    );
  }

  const todaysPreview = timelineDays.find((day) => day.day === TRIP_DAYS[0].day)?.events.length ?? 0;

  if (!me) {
    return (
      <div className="app grain">
        <NoticeBanner
          notice={notice}
          onClick={() => {
            if (notice?.eventId) {
              jumpToTimelineEvent(notice.eventId);
            }
          }}
          onClose={() => setNotice(null)}
        />
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div className="fade-up" style={{ textAlign: "center", width: "100%", maxWidth: 360 }}>
            <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: 100, background: "var(--gd)", color: "var(--gold)", fontSize: 11, fontWeight: 600, letterSpacing: 3, marginBottom: 20 }}>
              MARCH 20-22
            </div>
            <h1 className="syne" style={{ fontSize: 64, fontWeight: 800, lineHeight: 0.95, letterSpacing: -3, marginBottom: 4, background: "linear-gradient(135deg, #fff 30%, var(--gold))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              DUBAI
            </h1>
            <p style={{ color: "var(--td)", fontSize: 16, letterSpacing: 2, marginBottom: 18 }}>WEEKEND DECIDER</p>
            <p style={{ color: "#d6d6d6", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Enter your name and the shared 3-digit PIN, then drop into the main menu. The live lobby works over mobile data, not just the same Wi-Fi.
            </p>
            <Dots players={liveLobbyPlayers} max={MAX_PLAYERS} />
            <p style={{ color: "var(--tm)", fontSize: 13, marginTop: 12, marginBottom: 28 }}>
              {liveLobbyPlayers.length}/{MAX_PLAYERS} in lobby
              {liveLobbyPlayers.length > 0 && ` · ${liveLobbyPlayers.join(", ")}`}
            </p>
            <input
              value={nameInput}
              onChange={(event) => {
                setNameInput(event.target.value);
                setJoinError("");
              }}
              onKeyDown={(event) => event.key === "Enter" && handleJoin()}
              placeholder="Enter your name"
              style={{ width: "100%", padding: "16px 20px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 16, fontFamily: "'Outfit',sans-serif", outline: "none", textAlign: "center", marginBottom: 12 }}
            />
            <input
              value={pinInput}
              onChange={(event) => {
                setPinInput(event.target.value.replace(/\D/g, "").slice(0, 3));
                setJoinError("");
              }}
              onKeyDown={(event) => event.key === "Enter" && handleJoin()}
              placeholder="3-digit PIN"
              inputMode="numeric"
              maxLength={3}
              style={{ width: "100%", padding: "16px 20px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 16, fontFamily: "'Outfit',sans-serif", outline: "none", textAlign: "center", letterSpacing: 4, marginBottom: 12 }}
            />
            <button
              type="button"
              onClick={handleJoin}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 14,
                background: nameInput.trim() && pinInput.trim().length === 3 ? "var(--gold)" : "var(--s)",
                border: "none",
                color: nameInput.trim() && pinInput.trim().length === 3 ? "#07070c" : "var(--tm)",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "'Syne',sans-serif",
                cursor: nameInput.trim() && pinInput.trim().length === 3 ? "pointer" : "not-allowed",
              }}
            >
              Enter Main Menu
            </button>
            <button
              type="button"
              className="ghost-danger"
              onClick={handleReset}
              style={{ marginTop: 12 }}
            >
              <RotateCcw size={16} />
              Reset stuck room
            </button>
            {joinError && <p style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{joinError}</p>}
          </div>
        </div>
      </div>
    );
  }

  if (room.phase !== "lobby" && !isActivePlayer) {
    return (
      <div className="app grain">
        <NoticeBanner
          notice={notice}
          onClick={() => {
            if (notice?.eventId) {
              jumpToTimelineEvent(notice.eventId);
            }
          }}
          onClose={() => setNotice(null)}
        />
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div className="lobby-hero fade-up">
            <p className="timeline-kicker">Game in progress</p>
            <h2 className="syne" style={{ fontSize: 30, marginBottom: 12 }}>This round already started</h2>
            <p style={{ color: "var(--td)", lineHeight: 1.6 }}>
              You are connected to the room, but you were not in the roster when this round started. Wait for the reset or clear the room and start fresh.
            </p>
          </div>
          <button type="button" className="solid-action" onClick={handleReset}>
            Reset Room
          </button>
          <button type="button" className="ghost-chip" style={{ marginTop: 12, justifyContent: "center" }} onClick={handleLeaveSession}>
            Leave
          </button>
        </div>
      </div>
    );
  }

  if (room.phase === "lobby" && activePanel === "timeline") {
    return (
      <>
        <NoticeBanner
          notice={notice}
          onClick={() => {
            if (notice?.eventId) {
              jumpToTimelineEvent(notice.eventId);
            }
          }}
          onClose={() => setNotice(null)}
        />
        <TimelineWorkspace
          day={timelineDay}
          timelineSource={timelineSourceLabel}
          placeDetailsById={placeDetailsById}
          me={me}
          isHost={isHost}
          rosterCount={displayPlayers.length}
          unreadTimelineCount={unreadTimelineCount}
          highlightedEventId={highlightedEventId}
          onBack={() => {
            setActivePanel("menu");
            setUnreadTimelineCount(0);
          }}
          onPrevDay={() => setTimelineDayIndex((current) => Math.max(0, current - 1))}
          onNextDay={() => setTimelineDayIndex((current) => Math.min(timelineDays.length - 1, current + 1))}
          onAddEvent={openTimelineComposer}
          onDeleteEvent={handleDeleteTimelineEvent}
          onVoteEvent={handleVoteTimelineEvent}
          bindEventRef={bindEventRef}
        />
        <TimelineComposer
          open={timelineComposerOpen}
          draft={timelineDraft}
          placeDetailsById={placeDetailsById}
          onClose={() => setTimelineComposerOpen(false)}
          onChangeTime={(time) => setTimelineDraft((current) => ({ ...current, time }))}
          onToggleCategory={(categoryId) => {
            setTimelineDraft((current) => {
              const categories = toggleSelection(current.categories || [], categoryId);
              const availableSubcategories = new Set(getTimelineSubcategoryOptions(categories).map((item) => item.id));
              const subcategories = (current.subcategories || []).filter((subcategoryId) => availableSubcategories.has(subcategoryId));

              return {
                ...current,
                categories,
                category: null,
                subcategories,
                subcategory: null,
                placeId: null,
              };
            });
          }}
          onToggleSubcategory={(subcategoryId) => {
            setTimelineDraft((current) => ({
              ...current,
              subcategories: toggleSelection(current.subcategories || [], subcategoryId),
              subcategory: null,
              placeId: null,
            }));
          }}
          onSelectPlace={(placeId) => setTimelineDraft((current) => ({ ...current, placeId }))}
          onBackStep={handleTimelineDraftBack}
          onContinueFromTime={() => setTimelineDraft((current) => ({ ...current, step: "category" }))}
          onContinueFromCategory={() => {
            setTimelineDraft((current) => ({
              ...current,
              step: getTimelineSubcategoryOptions(current.categories || []).length > 0 ? "subcategory" : "place",
            }));
          }}
          onContinueFromSubcategory={() => setTimelineDraft((current) => ({ ...current, step: "place" }))}
          onViewAllPlaces={handleViewAllTimelinePlaces}
          onCreate={handleCreateTimelineEvent}
        />
      </>
    );
  }

  if (room.phase === "lobby" && activePanel === "places") {
    return (
      <>
        <NoticeBanner
          notice={notice}
          onClick={() => {
            if (notice?.eventId) {
              jumpToTimelineEvent(notice.eventId);
            }
          }}
          onClose={() => setNotice(null)}
        />
        <PlacesLibrary
          places={availablePlaces}
          placeDetailsById={placeDetailsById}
          selectedCategory={libraryCategory}
          sortBy={librarySort}
          suggestions={customPlaceSuggestions}
          onBack={() => setActivePanel("menu")}
          onOpenSuggest={() => setCustomPlaceComposerOpen(true)}
          onSelectCategory={setLibraryCategory}
          onSelectSort={setLibrarySort}
        />
        <CustomPlaceComposer
          open={customPlaceComposerOpen}
          draft={customPlaceDraft}
          saving={customPlaceSaving}
          onChange={(field, value) => setCustomPlaceDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => setCustomPlaceComposerOpen(false)}
          onSubmit={handleSubmitCustomPlace}
        />
      </>
    );
  }

  if (room.phase === "lobby" && activePanel === "lobby") {
    const canStart = displayPlayers.length === MAX_PLAYERS;

    return (
      <div className="app grain">
        <NoticeBanner
          notice={notice}
          onClick={() => {
            if (notice?.eventId) {
              jumpToTimelineEvent(notice.eventId);
            }
          }}
          onClose={() => setNotice(null)}
        />
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "28px 20px 40px", textAlign: "center" }}>
          <div className="lobby-hero fade-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
              <div style={{ textAlign: "left" }}>
                <p className="timeline-kicker">Room Lobby</p>
                <h2 className="syne" style={{ fontSize: 30, marginBottom: 8 }}>Weekend control room</h2>
                <p style={{ color: "var(--td)", fontSize: 14, lineHeight: 1.5 }}>
                  Everyone joins here first. When the roster hits 5/5, the host starts the game. If you are testing solo, fill the room with bots and run the full loop.
                </p>
              </div>
              <div className="lobby-count-chip">{displayPlayers.length}/{MAX_PLAYERS}</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 18 }}>
            <button type="button" className="ghost-chip" onClick={() => setActivePanel("menu")}>
              <ChevronLeft size={16} />
              Menu
            </button>
            <button type="button" className="ghost-danger" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset room
            </button>
          </div>
          <Dots players={displayPlayers} max={MAX_PLAYERS} />
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 8 }}>
            {displayPlayers.map((player, index) => (
              <div key={player} className={`fade-up s${Math.min(index + 1, 5)}`} style={{ padding: "12px 16px", borderRadius: 12, background: player === me ? "var(--gd)" : "var(--s)", border: `1px solid ${player === me ? "rgba(240,168,48,0.3)" : "var(--b)"}`, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: player === me ? "var(--gold)" : "var(--sh)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: player === me ? "#07070c" : "var(--t)" }}>
                  {player.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{player}</span>
                {index === 0 && <Crown size={14} style={{ color: "var(--gold)", marginLeft: "auto" }} />}
                {player === me && <span style={{ marginLeft: index === 0 ? 4 : "auto", fontSize: 11, color: "var(--td)" }}>(you)</span>}
              </div>
            ))}
          </div>
          {isHost && !canStart && (
            <button type="button" onClick={fillTestPlayers} className="ghost-danger" style={{ width: "100%", marginTop: 16, justifyContent: "center" }}>
              <Sparkles size={16} />
              Fill with test players
            </button>
          )}
          {isHost && (
            <button
              type="button"
              onClick={canStart ? handleStart : undefined}
              style={{
                width: "100%",
                marginTop: 16,
                padding: 16,
                borderRadius: 14,
                background: canStart ? "var(--gold)" : "var(--s)",
                border: "none",
                color: canStart ? "#07070c" : "var(--tm)",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "'Syne',sans-serif",
                cursor: canStart ? "pointer" : "not-allowed",
              }}
            >
              {canStart ? "Start game" : `Need ${MAX_PLAYERS - displayPlayers.length} more`}
            </button>
          )}
          {!isHost && <Waiting message="Waiting for host..." sub="Hang tight while the room fills." />}
          <TimelinePreviewPanel timelineDays={timelineDays} timelineSource={timelineSourceLabel} placeDetailsById={placeDetailsById} />
        </div>
      </div>
    );
  }

  if (room.phase === "lobby") {
    return (
      <div className="app grain">
        <NoticeBanner
          notice={notice}
          onClick={() => {
            if (notice?.eventId) {
              jumpToTimelineEvent(notice.eventId);
            }
          }}
          onClose={() => setNotice(null)}
        />
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "28px 20px 40px" }}>
          <div className="lobby-hero fade-up">
            <p className="timeline-kicker">Main Menu</p>
            <h2 className="syne" style={{ fontSize: 34, marginBottom: 10 }}>Welcome, {me}</h2>
            <p style={{ color: "var(--td)", fontSize: 14, lineHeight: 1.6 }}>
              The room is live over the internet. Share the link, watch the count update in real time, then either jump into the game lobby or manage the weekend timeline.
            </p>
          </div>

          <div className="menu-grid fade-up s1">
            <MenuActionCard
              icon={<Gamepad2 size={22} />}
              title="Kahoot-style game"
              copy="Join the live lobby, fill bots if needed, then run the full vote and swipe loop."
              meta={`${liveLobbyPlayers.length}/${MAX_PLAYERS} in lobby · ${getPhaseLabel(room.phase)}`}
              badge={liveLobbyPlayers.length > 0 ? `${liveLobbyPlayers.length}/${MAX_PLAYERS}` : null}
              accent="var(--gold)"
              onClick={() => setActivePanel("lobby")}
            />
            <MenuActionCard
              icon={<CalendarDays size={22} />}
              title="Timeline"
              copy="Locked reservations already sit here. Add more events, vote yes/no, and keep the trip organized."
              meta={`${todaysPreview} events on Friday · ${pendingTimelineCount} pending`}
              badge={unreadTimelineCount > 0 ? `${unreadTimelineCount} new` : null}
              accent="var(--teal)"
              onClick={() => {
                setActivePanel("timeline");
                setUnreadTimelineCount(0);
              }}
            />
            <MenuActionCard
              icon={<MapPin size={22} />}
              title="All places"
              copy="Open the full curated library, browse every available card, and save extra suggestions for later review."
              meta={`${allBrowseablePlaces.length} visible places · shared deck`}
              accent="var(--purple)"
              onClick={() => setActivePanel("places")}
            />
          </div>

          <div className="menu-info-strip fade-up s2">
            <div className="menu-info-pill">
              <Users size={14} />
              <span>{liveLobbyPlayers.length}/{MAX_PLAYERS} in lobby</span>
            </div>
            <div className="menu-info-pill">
              <Navigation size={14} />
              <span>{locationStatus === "ready" ? "Live location on" : "Using FIVE Palm fallback"}</span>
            </div>
            <div className="menu-info-pill">
              <MapPin size={14} />
              <span>{timelineSourceLabel === "live" ? "Realtime timeline" : timelineSourceLabel === "hybrid" ? "Shared timeline" : "Local locked plans"}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18 }} className="fade-up s3">
            <button type="button" className="ghost-danger" style={{ flex: 1, justifyContent: "center" }} onClick={handleReset}>
              <RotateCcw size={16} />
              Reset room
            </button>
            <button type="button" className="ghost-chip" style={{ flex: 1, justifyContent: "center" }} onClick={handleLeaveSession}>
              Leave
            </button>
          </div>

          <TimelinePreviewPanel timelineDays={timelineDays} timelineSource={timelineSourceLabel} placeDetailsById={placeDetailsById} />
          <FeaturedPlacesRail
            places={featuredPlaces}
            placeDetailsById={placeDetailsById}
            selectedCategory={featuredCategory}
            onSelectCategory={setFeaturedCategory}
          />
        </div>
      </div>
    );
  }

  if (room.phase === "category_vote" && !room.categoryShowResults) {
    const myVote = room.categoryVotes[me];
    const allVoted = room.players.every((player) => room.categoryVotes[player]);
    const votedCount = Object.keys(room.categoryVotes).length;

    return (
      <div className="app grain">
        <NoticeBanner
          notice={notice}
          onClick={() => {
            if (notice?.eventId) {
              jumpToTimelineEvent(notice.eventId);
            }
          }}
          onClose={() => setNotice(null)}
        />
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "32px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>
              ROUND {room.round}
            </p>
            <h2 className="syne" style={{ fontSize: 26, marginBottom: 6 }}>What are we doing?</h2>
            <p style={{ color: "var(--td)", fontSize: 14 }}>{votedCount}/{room.players.length} voted</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {room.categoryOptions.map((categoryId, index) => {
              const category = CATEGORIES.find((item) => item.id === categoryId);

              if (!category) return null;

              return (
                <button
                  key={categoryId}
                  type="button"
                  className={`cat-btn card-enter s${Math.min(index + 1, 5)} ${selectedCat === categoryId ? "selected" : ""}`}
                  onClick={() => !myVote && setSelectedCat(categoryId)}
                  disabled={Boolean(myVote)}
                  style={myVote ? { opacity: myVote === categoryId ? 1 : 0.3, cursor: "default" } : {}}
                >
                  <span style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, background: `${category.color}22`, flexShrink: 0 }}>
                    {category.emoji}
                  </span>
                  <span>{category.label}</span>
                  {myVote === categoryId && <Check size={20} style={{ marginLeft: "auto", color: "var(--green)" }} />}
                </button>
              );
            })}
          </div>
          {!myVote ? (
            <button
              type="button"
              onClick={handleCatVote}
              disabled={!selectedCat}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 14,
                background: selectedCat ? "var(--gold)" : "var(--s)",
                border: "none",
                color: selectedCat ? "#07070c" : "var(--tm)",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "'Syne',sans-serif",
                cursor: selectedCat ? "pointer" : "not-allowed",
              }}
            >
              Lock In
            </button>
          ) : !allVoted ? (
            <Waiting message="Vote locked in" sub={`Waiting for ${room.players.filter((player) => !room.categoryVotes[player]).join(", ")}`} />
          ) : isHost ? (
            <button type="button" onClick={handleCatReveal} className="solid-action">
              Reveal results
            </button>
          ) : (
            <Waiting message="All votes in" sub="Host is revealing..." />
          )}
        </div>
      </div>
    );
  }

  if (room.phase === "category_vote" && room.categoryShowResults) {
    const counts = {};

    room.categoryOptions.forEach((categoryId) => {
      counts[categoryId] = { c: 0, v: [] };
    });

    Object.entries(room.categoryVotes).forEach(([player, categoryId]) => {
      if (counts[categoryId]) {
        counts[categoryId].c += 1;
        counts[categoryId].v.push(player);
      }
    });

    const sorted = Object.entries(counts).sort((left, right) => right[1].c - left[1].c);
    const majority = getMajorityCount(room.players.length);
    const winner = sorted[0]?.[1].c >= majority ? sorted[0][0] : null;

    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div className="fade-up" style={{ padding: "32px 20px" }}>
          <h2 className="syne" style={{ fontSize: 24, marginBottom: 24, textAlign: "center" }}>
            {winner ? "We have a winner" : "Too split - revote"}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {sorted.map(([id, data]) => {
              const category = CATEGORIES.find((item) => item.id === id);
              const pct = room.players.length > 0 ? (data.c / room.players.length) * 100 : 0;

              return (
                <div key={id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{category?.emoji} {category?.label}</span>
                    <span style={{ fontSize: 14, color: "var(--td)" }}>{data.c} vote{data.c !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="vote-bar">
                    <div className="vote-bar-fill" style={{ width: `${Math.max(pct, 5)}%`, background: id === winner ? (category?.gradient || "var(--gold)") : "var(--sh)", color: id === winner ? "#07070c" : "#bbb" }}>
                      {data.v.join(", ")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {winner && (
            <div className="bounce-in" style={{ textAlign: "center", padding: 20, borderRadius: 16, background: "var(--gd)", border: "1px solid rgba(240,168,48,0.3)", marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: "var(--gold)", fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>WINNER</p>
              <p className="syne" style={{ fontSize: 28, fontWeight: 800 }}>
                {CATEGORIES.find((item) => item.id === winner)?.emoji} {CATEGORIES.find((item) => item.id === winner)?.label}
              </p>
            </div>
          )}
          {isHost && (
            <button type="button" onClick={handleCatProceed} className="solid-action">
              {winner ? "Continue" : "Revote"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (room.phase === "subcat_swipe") {
    const myDone = room.subcatSwipes[me]?.done;
    const category = CATEGORIES.find((item) => item.id === room.winningCategory);

    if (myDone) {
      const doneCount = room.players.filter((player) => room.subcatSwipes[player]?.done).length;

      return (
        <div className="app grain">
          {testMode && <div className="test-banner">TEST MODE</div>}
          <Waiting
            message="Nice picks"
            sub={`${doneCount}/${room.players.length} done swiping`}
            players={room.players.filter((player) => room.subcatSwipes[player]?.done)}
            max={room.players.length}
          />
        </div>
      );
    }

    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "24px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, color: category?.color, marginBottom: 4 }}>
              {category?.emoji} {category?.label?.toUpperCase()}
            </p>
            <h2 className="syne" style={{ fontSize: 22, marginBottom: 4 }}>What sounds good?</h2>
            <p style={{ color: "var(--td)", fontSize: 13 }}>Swipe right on what you are into</p>
          </div>
          {subcatCards.length > 0 ? (
            <SwipeStack
              cards={subcatCards}
              onSwipe={handleSubcatSwipe}
              renderCard={(card) => (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, background: "var(--bg)" }}>
                  <span style={{ fontSize: 72, marginBottom: 16 }}>{card.emoji}</span>
                  <h3 className="syne" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{card.label}</h3>
                  <span style={{ padding: "4px 14px", borderRadius: 100, background: "var(--sh)", color: "var(--td)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: 1 }}>
                    {card.group === "cuisine" ? "Cuisine" : card.group === "location" ? "Area" : card.group === "type" ? "Type" : card.group === "vibe" ? "Vibe" : card.group}
                  </span>
                </div>
              )}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="waiting-dots"><span /><span /><span /></div>
              <p style={{ color: "var(--td)", marginTop: 12 }}>Saving picks...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (room.phase === "place_swipe") {
    const myDone = room.placeSwipes[me]?.done;
    const category = CATEGORIES.find((item) => item.id === room.winningCategory);

    if (myDone) {
      const doneCount = room.players.filter((player) => room.placeSwipes[player]?.done).length;

      return (
        <div className="app grain">
          {testMode && <div className="test-banner">TEST MODE</div>}
          <Waiting
            message="Picks locked in"
            sub={`${doneCount}/${room.players.length} done`}
            players={room.players.filter((player) => room.placeSwipes[player]?.done)}
            max={room.players.length}
          />
        </div>
      );
    }

    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "24px 20px" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, color: category?.color, marginBottom: 4 }}>
              {category?.emoji} PICK YOUR SPOTS
            </p>
            <h2 className="syne" style={{ fontSize: 22, marginBottom: 4 }}>Swipe right on 5 places</h2>
            <p style={{ color: "var(--td)", fontSize: 13 }}>Choose hard yeses only.</p>
          </div>
          {(placeCards.length > 0 && placeSwipesLeft > 0) ? (
            <SwipeStack
              cards={placeCards}
              onSwipe={handlePlaceSwipe}
              swipesLeft={placeSwipesLeft}
              maxSwipes={MAX_PLACE_SWIPES}
              renderCard={(place) => {
                const details = placeDetailsById[place.id];
                const categoryBadge = category?.label;

                return (
                  <div className="swipe-place-card">
                    <div>
                      <PlacePhotoCarousel
                        photos={getPlacePhotoUrls(details)}
                        fallback={place.img}
                        alt={place.name}
                        badge={categoryBadge}
                        height={188}
                        radius={18}
                      />
                      <h3 className="swipe-place-title">{details?.name || place.name}</h3>
                      <p className="swipe-place-description">{details?.editorialSummary || place.vibe}</p>
                      {details?.formattedAddress && <p className="swipe-place-address">{details.formattedAddress}</p>}
                    </div>
                    <PlaceDetailChips place={place} details={details} />
                  </div>
                );
              }}
            />
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="bounce-in" style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <p className="syne" style={{ fontSize: 18, fontWeight: 700 }}>{placeSwipesLeft <= 0 ? "All swipes used" : "Deck cleared"}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (room.phase === "final_vote") {
    const counts = {};

    room.finalOptions.forEach((id) => {
      counts[id] = { c: 0, v: [] };
    });

    Object.entries(room.finalVotes).forEach(([player, selections]) => {
      selections.forEach((id) => {
        if (counts[id]) {
          counts[id].c += 1;
          counts[id].v.push(player);
        }
      });
    });

    const sorted = Object.entries(counts).sort((left, right) => right[1].c - left[1].c);
    const unanimousCount = getUnanimousCount(room.players.length);
    const unanimousWinners = sorted.filter(([, data]) => data.c === unanimousCount);
    const winner = unanimousWinners.length === 1 ? unanimousWinners[0][0] : null;
    const rouletteVotesCount = room.players.filter((player) => room.rouletteVotes[player]).length;

    if (room.finalShowResults) {
      return (
        <div className="app grain">
          {testMode && <div className="test-banner">TEST MODE</div>}
          <div className="fade-up" style={{ padding: "32px 20px 120px" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 2, marginBottom: 4 }}>
                ROUND {room.finalRound}
              </p>
              <h2 className="syne" style={{ fontSize: 24 }}>
                {winner ? "We are going to..." : "Still split"}
              </h2>
              <p style={{ color: "var(--td)", fontSize: 13, marginTop: 6 }}>
                Direct win still needs everyone on the same place.
              </p>
            </div>
            {sorted.map(([id, data]) => {
              const place = getPlaceById(id);
              const pct = room.players.length > 0 ? (data.c / room.players.length) * 100 : 0;

              return (
                <div key={id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{place?.img} {place?.name || id}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: data.c === unanimousCount ? "var(--green)" : "var(--td)" }}>
                      {data.c}/{room.players.length}
                    </span>
                  </div>
                  <div className="vote-bar">
                    <div className="vote-bar-fill" style={{ width: `${Math.max(pct, 8)}%`, background: data.c === unanimousCount ? "linear-gradient(90deg,var(--green),#22D3EE)" : "var(--sh)", color: data.c === unanimousCount ? "#07070c" : "var(--td)" }}>
                      {data.v.join(", ")}
                    </div>
                  </div>
                </div>
              );
            })}

            {!winner && (
              <button type="button" className="roulette-cta" onClick={voteForRoulette}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.4, marginBottom: 4 }}>TIEBREAKER</p>
                  <p className="syne" style={{ fontSize: 22 }}>Vote for roulette</p>
                  <p style={{ fontSize: 13, color: "rgba(7,7,12,0.7)", marginTop: 4 }}>
                    {rouletteVotesCount}/{room.players.length} locked in
                  </p>
                </div>
                <Sparkles size={24} />
              </button>
            )}

            {isHost && (
              <button type="button" onClick={handleFinalProceed} className="solid-action" style={{ marginTop: 18 }}>
                {winner ? "Lock it in" : "Revote among the leaders"}
              </button>
            )}
          </div>
        </div>
      );
    }

    const mySubmitted = room.finalVotes[me] !== undefined;
    const submittedCount = Object.keys(room.finalVotes).length;
    const urgent = timerLeft <= 10;

    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <p style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 2 }}>ROUND {room.finalRound}</p>
              <h2 className="syne" style={{ fontSize: 22 }}>Final vote</h2>
              <p style={{ color: "var(--td)", fontSize: 13 }}>Pick up to {room.finalMaxSelections} · {submittedCount}/{room.players.length} voted</p>
            </div>
            <div className="timer-ring" style={{ color: urgent ? "var(--red)" : "var(--t)", animation: urgent ? "timer-pulse .5s infinite" : "none", textShadow: urgent ? "0 0 20px currentColor" : "none" }}>
              {timerLeft}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {room.finalOptions.map((placeId) => {
              const place = getPlaceById(placeId);

              if (!place) return null;

              const details = placeDetailsById[placeId];
              const busyness = describeBusyness(details?.currentBusyness);
              const isSelected = finalSel.includes(placeId);
              const atMax = finalSel.length >= room.finalMaxSelections;
              const disabled = mySubmitted || (!isSelected && atMax);

              return (
                <div
                  key={placeId}
                  className={`final-option ${isSelected ? "sel" : ""} ${disabled && !isSelected ? "dis" : ""}`}
                  onClick={() => !disabled && toggleFinal(placeId)}
                >
                  <PlacePhotoCarousel
                    photos={getPlacePhotoUrls(details)}
                    fallback={place.img}
                    alt={place.name}
                    height={64}
                    radius={16}
                    className="final-option-media"
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{details?.name || place.name}</p>
                    <p style={{ color: "var(--td)", fontSize: 12, marginBottom: 6 }}>{details?.editorialSummary || place.vibe}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ color: "var(--td)", fontSize: 11 }}>{formatDistance(details?.distanceMeters)}</span>
                      {typeof details?.rating === "number" && <span style={{ color: "var(--td)", fontSize: 11 }}>★ {details.rating.toFixed(1)}</span>}
                      {busyness && <span style={{ color: busyness.tone, fontSize: 11, fontWeight: 700 }}>{busyness.label}</span>}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="bounce-in" style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={16} color="#07070c" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <span style={{ fontSize: 13, color: "var(--td)" }}>{finalSel.length}/{room.finalMaxSelections} selected</span>
          {!mySubmitted ? (
            <button
              type="button"
              onClick={doFinalSubmit}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 16,
                borderRadius: 14,
                background: finalSel.length > 0 ? "var(--gold)" : "var(--s)",
                border: "none",
                color: finalSel.length > 0 ? "#07070c" : "var(--tm)",
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "'Syne',sans-serif",
                cursor: "pointer",
              }}
            >
              {finalSel.length > 0 ? "Submit vote" : "Skip (0 votes)"}
            </button>
          ) : (
            <p style={{ textAlign: "center", color: "var(--green)", fontWeight: 600, fontSize: 14, padding: "12px 0" }}>
              Submitted - waiting for others
            </p>
          )}
        </div>
      </div>
    );
  }

  if (room.phase === "roulette_spin") {
    const rouletteOptions = room.rouletteOptions.map((placeId) => getPlaceById(placeId)).filter(Boolean);

    return (
      <div className="app grain">
        {testMode && <div className="test-banner">TEST MODE</div>}
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 20px", textAlign: "center" }}>
          <p style={{ color: "#ffb76a", fontSize: 12, fontWeight: 800, letterSpacing: 2, marginBottom: 12 }}>ROULETTE TIEBREAKER</p>
          <h2 className="syne" style={{ fontSize: 32, marginBottom: 10 }}>Let fate call it</h2>
          <p style={{ color: "var(--td)", fontSize: 14, marginBottom: 30 }}>
            Everyone voted to stop arguing. The wheel is picking the winner now.
          </p>
          <div className="roulette-shell">
            {rouletteOptions.map((place, index) => (
              <div key={place.id} className={`roulette-row ${rouletteCursor === index ? "active" : ""}`}>
                <span style={{ fontSize: 28 }}>{place.img}</span>
                <span className="roulette-name">{place.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (room.phase === "decided") {
    const place = getPlaceById(room.decidedPlace);
    const details = place ? placeDetailsById[place.id] : null;
    const busyness = describeBusyness(details?.currentBusyness);
    const category = CATEGORIES.find((item) => item.id === place?.cat);

    return (
      <div className="app grain">
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
          <PlacePhotoCarousel
            photos={getPlacePhotoUrls(details)}
            fallback={place?.img || "🎉"}
            alt={place?.name || "Decided place"}
            height={240}
            radius={26}
            className="decided-media bounce-in"
          />
          <p className="fade-up s1" style={{ color: "var(--gold)", fontSize: 12, fontWeight: 600, letterSpacing: 3, marginBottom: 8 }}>IT IS DECIDED</p>
          <h1 className="syne fade-up s2" style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{details?.name || place?.name}</h1>
          <p className="fade-up s3" style={{ color: "var(--td)", fontSize: 15, marginBottom: 4 }}>{details?.editorialSummary || place?.vibe}</p>
          {details?.formattedAddress && <p className="fade-up s3" style={{ color: "#cfcfcf", fontSize: 13, marginTop: 8 }}>{details.formattedAddress}</p>}
          {details?.openingHoursSummary && <p className="fade-up s4" style={{ color: "var(--tm)", fontSize: 12, marginTop: 6 }}>{details.openingHoursSummary}</p>}
          <div className="fade-up s4" style={{ display: "flex", gap: 8, marginTop: 12, marginBottom: 40, flexWrap: "wrap", justifyContent: "center" }}>
            <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--gd)", color: "var(--gold)", fontSize: 13, fontWeight: 700 }}>
              {"$".repeat(details?.priceLevel || place?.cost || 1)}
            </span>
            <span style={{ padding: "6px 14px", borderRadius: 8, background: category ? `${category.color}22` : "var(--s)", color: category?.color, fontSize: 13, fontWeight: 600 }}>
              {category?.emoji} {category?.label}
            </span>
            {typeof details?.rating === "number" && (
              <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--sh)", color: "var(--td)", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                <Star size={12} /> {details.rating.toFixed(1)}
              </span>
            )}
            {details?.distanceMeters && (
              <span style={{ padding: "6px 14px", borderRadius: 8, background: "var(--s)", color: "#d7d7d7", fontSize: 13 }}>
                {formatDistance(details.distanceMeters)}
              </span>
            )}
            {busyness && (
              <span style={{ padding: "6px 14px", borderRadius: 8, background: busyness.background, color: busyness.tone, fontSize: 13, fontWeight: 700 }}>
                {busyness.label}
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            {details?.googleMapsUri && (
              <a href={details.googleMapsUri} target="_blank" rel="noreferrer" style={{ padding: "14px 24px", borderRadius: 14, background: "var(--gold)", color: "#07070c", fontSize: 14, fontWeight: 700, fontFamily: "'Syne',sans-serif", textDecoration: "none" }}>
                Open in Maps
              </a>
            )}
            <button type="button" onClick={handleReset} style={{ padding: "14px 32px", borderRadius: 14, background: "var(--s)", border: "1px solid var(--bl)", color: "var(--t)", fontSize: 14, fontWeight: 600, fontFamily: "'Syne',sans-serif", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <RotateCcw size={16} />
              New round
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app grain">
      <div style={{ padding: 32, textAlign: "center" }}>
        <p>Phase: {room.phase}</p>
        <button type="button" onClick={handleReset} style={{ marginTop: 16, padding: "12px 24px", borderRadius: 12, background: "var(--gold)", border: "none", color: "#07070c", fontWeight: 700, cursor: "pointer" }}>
          Reset
        </button>
      </div>
    </div>
  );
}
