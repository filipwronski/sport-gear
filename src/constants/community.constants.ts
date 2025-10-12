/**
 * Radius options for quick selection
 */
export const RADIUS_OPTIONS = [
  { value: 10, label: "10 km" },
  { value: 25, label: "25 km" },
  { value: 50, label: "50 km" },
  { value: 100, label: "100 km" },
];

/**
 * Time range options (in hours)
 */
export const TIME_RANGE_OPTIONS = [
  { value: 6, label: "Ostatnie 6h" },
  { value: 24, label: "Ostatnie 24h" },
  { value: 48, label: "Ostatnie 48h" },
  { value: 168, label: "Ostatni tydzień" }, // 7 * 24 = 168
];

/**
 * Temperature range options (degrees)
 */
export const TEMPERATURE_RANGE_OPTIONS = [
  { value: 1, label: "±1°C" },
  { value: 3, label: "±3°C" },
  { value: 5, label: "±5°C" },
  { value: 10, label: "±10°C" },
];

/**
 * Minimum rating options
 */
export const MIN_RATING_OPTIONS = [
  { value: 1, label: "1+ gwiazdki" },
  { value: 2, label: "2+ gwiazdki" },
  { value: 3, label: "3+ gwiazdki" },
  { value: 4, label: "4+ gwiazdki" },
  { value: 5, label: "5 gwiazdek" },
];

/**
 * Cache configuration
 */
export const COMMUNITY_CACHE_CONFIG = {
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
  staleTime: 5 * 60 * 1000, // 5 minutes
};

/**
 * Debounce delays (in milliseconds)
 */
export const DEBOUNCE_DELAYS = {
  filterChange: 500,
  searchInput: 300,
};

/**
 * API error messages
 */
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: "Brak połączenia z internetem",
  TIMEOUT_ERROR: "Żądanie zajmuje zbyt dużo czasu",
  SERVER_ERROR: "Wystąpił błąd serwera",
  UNAUTHORIZED: "Sesja wygasła. Zaloguj się ponownie.",
  LOCATION_NOT_FOUND: "Wybrana lokalizacja nie została znaleziona",
  VALIDATION_ERROR: "Błąd walidacji danych",
};

/**
 * UI constants
 */
export const UI_CONSTANTS = {
  skeletonCardsCount: 9,
  maxModalHeight: "90vh",
  mobileBreakpoint: 768,
  tabletBreakpoint: 1024,
};

/**
 * Activity type display names
 */
export const ACTIVITY_TYPE_LABELS = {
  recovery: "Regeneracja",
  spokojna: "Spokojna",
  tempo: "Tempo",
  interwaly: "Interwały",
};
