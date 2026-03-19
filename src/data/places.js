export const MAX_PLAYERS = 5;
export const SWIPE_THRESHOLD = 80;
export const MAX_PLACE_SWIPES = 5;
export const FINAL_VOTE_SECONDS = 60;
export const TEST_NAMES = ["Test2", "Test3", "Test4", "Test5"];

export const CATEGORIES = [
  { id: "food", label: "Food", emoji: "🍽️", color: "#F0A830", gradient: "linear-gradient(135deg, #F0A830, #E8832A)" },
  { id: "chill", label: "Chill", emoji: "🌊", color: "#3ECFCF", gradient: "linear-gradient(135deg, #3ECFCF, #2A9FD6)" },
  { id: "activity", label: "Activity", emoji: "⚡", color: "#C76BFF", gradient: "linear-gradient(135deg, #C76BFF, #8B5CF6)" },
];

export const SUBCATEGORIES = {
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

export const ALL_PLACES = [
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

export function newRoom() {
  return {
    players: [], phase: "lobby", round: 1,
    categoryOptions: ["food", "chill", "activity"],
    categoryVotes: {}, categoryShowResults: false, winningCategory: null,
    subcatSwipes: {}, placeSwipes: {},
    finalOptions: [], finalVotes: {}, finalMaxSelections: 4,
    finalVoteEndTime: null, finalRound: 1, finalShowResults: false,
    decidedPlace: null,
  };
}
