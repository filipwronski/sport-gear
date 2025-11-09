// ============================================================================
// Database Table Types - Shortcuts
// ============================================================================

// ============================================================================
// Enums
// ============================================================================

export type BikeTypeEnum = "szosowy" | "gravelowy" | "mtb" | "czasowy";
export type BikeStatusEnum = "active" | "archived" | "sold";
export type ServiceTypeEnum =
  | "lancuch"
  | "kaseta"
  | "klocki_przod"
  | "klocki_tyl"
  | "opony"
  | "przerzutki"
  | "hamulce"
  | "przeglad_ogolny"
  | "inne";
export type ServiceLocationEnum = "warsztat" | "samodzielnie";
export type ActivityTypeEnum = "recovery" | "spokojna" | "tempo" | "interwaly";
export type WorkoutIntensity =
  | "rekreacyjny"
  | "tempo"
  | "intensywny"
  | "długodystansowy";
export type ThermalFeelingEnum = "marzlak" | "neutralnie" | "szybko_mi_goraco";
export type ReputationBadgeEnum =
  | "nowicjusz"
  | "regularny"
  | "ekspert"
  | "mistrz";
export type UnitsEnum = "metric" | "imperial";
export type ReminderStatusEnum =
  | "active"
  | "completed"
  | "overdue"
  | "upcoming";

// ============================================================================
// Nested Object Types
// ============================================================================

/**
 * Thermal preferences stored in user profile
 * Used for personalized outfit recommendations
 */
export interface ThermalPreferences {
  general_feeling: ThermalFeelingEnum;
  cold_hands: boolean;
  cold_feet: boolean;
  cap_threshold_temp: number;
}

/**
 * Outfit torso layers structure
 * Supports base, mid, and outer layer configuration
 */
export interface OutfitTorso {
  base: string;
  mid: string;
  outer: string;
}

/**
 * Outfit feet configuration
 * Includes socks and optional shoe covers
 */
export interface OutfitFeet {
  socks: string;
  covers: string;
}

/**
 * Individual clothing item for new recommendation system
 */
export type ClothingItem =
  | "nogawki"
  | "rękawki"
  | "koszulka termoaktywna"
  | "bluza"
  | "kurtka"
  | "krótkie spodenki"
  | "długie spodnie"
  | "czapka"
  | "rękawiczki letnie"
  | "rękawiczki jesienne"
  | "rękawiczki zimowe"
  | "skarpetki letnie"
  | "skarpetki zimowe"
  | "noski na buty"
  | "ochraniacze na buty"
  | "komin na szyję"
  | "kurtka przeciwwiatrowa"
  | "kurtka zimowa"
  | "kamizelka przeciwwiatrowa";

/**
 * New simple outfit recommendation as list of clothing items
 */
export interface ClothingRecommendationDTO {
  items: ClothingItem[];
}

/**
 * Complete outfit configuration for all body zones
 * Used in recommendations and feedback
 */
export interface OutfitDTO {
  head: string;
  torso: OutfitTorso;
  arms: string;
  hands: string;
  legs: string;
  feet: OutfitFeet;
  neck: string;
}

/**
 * Zone-specific comfort ratings
 * Used in feedback to rate specific body parts (1-5 scale)
 */
export interface ZoneRatings {
  head?: number;
  torso?: number;
  arms?: number;
  hands?: number;
  legs?: number;
  feet?: number;
  neck?: number;
}

/**
 * Geographic coordinates
 * Transformed from PostGIS geometry type
 */
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ============================================================================
// Profile Management
// ============================================================================

/**
 * User profile DTO
 * Derived from profiles table with parsed JSON fields
 */
export interface ProfileDTO {
  id: string;
  display_name: string | null;
  thermal_preferences: ThermalPreferences | null;
  thermal_adjustment: number | null;
  feedback_count: number | null;
  pseudonym: string | null;
  reputation_badge: ReputationBadgeEnum | null;
  share_with_community: boolean | null;
  units: UnitsEnum | null;
  default_location_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Command to update user profile
 * All fields optional for partial updates
 */
export interface UpdateProfileCommand {
  display_name?: string;
  thermal_preferences?: ThermalPreferences;
  share_with_community?: boolean;
  units?: UnitsEnum;
  default_location_id?: string | null;
}

/**
 * Complete user data export (GDPR compliance)
 * Includes all user-related data from all tables
 */
export interface ProfileExportDTO {
  profile: ProfileDTO;
  locations: LocationDTO[];
  bikes: BikeDTO[];
  service_records: ServiceRecordDTO[];
  service_reminders: ServiceReminderDTO[];
  outfit_feedbacks: FeedbackDTO[];
  shared_outfits: CommunityOutfitDTO[];
  export_timestamp: string;
}

// ============================================================================
// Location Management
// ============================================================================

/**
 * User location DTO
 * Derived from user_locations table with parsed geometry
 */
export interface LocationDTO {
  id: string;
  location: Coordinates;
  city: string;
  country_code: string;
  is_default: boolean | null;
  label: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Command to create new location
 */
export interface CreateLocationCommand {
  latitude: number;
  longitude: number;
  city: string;
  country_code: string;
  is_default?: boolean;
  label?: string;
}

/**
 * Command to update existing location
 * All fields optional for partial updates
 */
export interface UpdateLocationCommand {
  latitude?: number;
  longitude?: number;
  city?: string;
  country_code?: string;
  is_default?: boolean;
  label?: string;
}

// ============================================================================
// Weather & Recommendations
// ============================================================================

/**
 * Current weather data
 * Sourced from external weather API, not stored in DB
 */
export interface WeatherDTO {
  temperature: number;
  feels_like: number;
  wind_speed: number;
  humidity: number;
  rain_mm: number;
  description: string;
  icon: string;
}

/**
 * AI-generated outfit recommendation
 * Combines weather data with personalized outfit suggestion
 */
export interface RecommendationDTO {
  weather: WeatherDTO;
  recommendation: OutfitDTO;
  additional_tips: string[];
  personalized: boolean;
  thermal_adjustment: number;
  computation_time_ms: number;
}

/**
 * New simplified outfit recommendation
 * Combines weather data with list of clothing items
 */
export interface NewRecommendationDTO {
  weather: WeatherDTO;
  recommendation: ClothingRecommendationDTO;
  workout_intensity: WorkoutIntensity;
  workout_duration: number;
  additional_tips: string[];
  personalized: boolean;
  thermal_adjustment: number;
  computation_time_ms: number;
}

/**
 * Single day forecast data
 */
export interface ForecastDayDTO {
  date: string;
  temperature_min: number;
  temperature_max: number;
  wind_speed: number;
  rain_mm: number;
  description: string;
  quick_recommendation: string;
}

/**
 * 7-day weather forecast
 */
export interface ForecastDTO {
  forecast: ForecastDayDTO[];
}

/**
 * Query parameters for GET /api/weather/forecast
 */
export interface GetForecastParams {
  lat: number;
  lng: number;
}

// ============================================================================
// Feedback System
// ============================================================================

/**
 * Outfit feedback DTO
 * Derived from outfit_feedbacks table with parsed JSON fields
 */
export interface FeedbackDTO {
  id: string;
  temperature: number;
  feels_like: number;
  wind_speed: number;
  humidity: number;
  rain_mm: number | null;
  activity_type: ActivityTypeEnum;
  duration_minutes: number;
  actual_outfit: OutfitDTO;
  overall_rating: number;
  zone_ratings: ZoneRatings | null;
  notes: string | null;
  shared_with_community: boolean | null;
  location_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Command to create post-training feedback
 * Excludes auto-generated fields (id, timestamps)
 */
export interface CreateFeedbackCommand {
  location_id?: string;
  temperature: number;
  feels_like: number;
  wind_speed: number;
  humidity: number;
  rain_mm?: number;
  activity_type: ActivityTypeEnum;
  duration_minutes: number;
  actual_outfit: OutfitDTO;
  overall_rating: number;
  zone_ratings?: ZoneRatings;
  notes?: string;
  shared_with_community?: boolean;
}

/**
 * Paginated feedbacks list response
 */
export interface FeedbacksListDTO {
  feedbacks: FeedbackDTO[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// Community Features
// ============================================================================

/**
 * Community shared outfit DTO
 * Derived from shared_outfits view with computed distance
 */
export interface CommunityOutfitDTO {
  id: string;
  user_pseudonym: string;
  reputation_badge: ReputationBadgeEnum;
  feedback_count: number;
  distance_km: number;
  weather_conditions: {
    temperature: number;
    feels_like: number;
    wind_speed: number;
    humidity: number;
    rain_mm: number;
  };
  activity_type: ActivityTypeEnum;
  outfit: OutfitDTO;
  overall_rating: number;
  created_at: string | null;
}

/**
 * Paginated community outfits list response
 */
export interface CommunityOutfitsListDTO {
  outfits: CommunityOutfitDTO[];
  total: number;
  has_more: boolean;
}

// ============================================================================
// Bike Management
// ============================================================================

/**
 * Next service information (computed)
 */
export interface NextServiceInfo {
  service_type: ServiceTypeEnum;
  target_mileage: number;
  km_remaining: number;
  status: ReminderStatusEnum;
}

/**
 * Bike DTO with computed fields
 * Derived from bikes table with additional aggregated data
 */
export interface BikeDTO {
  id: string;
  name: string;
  type: BikeTypeEnum;
  purchase_date: string | null;
  current_mileage: number | null;
  status: BikeStatusEnum | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  next_service: NextServiceInfo | null;
  active_reminders_count: number;
  total_cost: number;
}

/**
 * Command to create new bike
 * Only required fields: name and type
 */
export interface CreateBikeCommand {
  name: string;
  type: BikeTypeEnum;
  purchase_date?: string;
  current_mileage?: number;
  notes?: string;
}

/**
 * Command to update bike
 * All fields optional for partial updates
 */
export interface UpdateBikeCommand {
  name?: string;
  type?: BikeTypeEnum;
  purchase_date?: string;
  current_mileage?: number;
  status?: BikeStatusEnum;
  notes?: string;
}

/**
 * Command to quickly update bike mileage
 * Dashboard quick action
 */
export interface UpdateBikeMileageCommand {
  current_mileage: number;
}

/**
 * Response after mileage update
 */
export interface UpdateBikeMileageResponse {
  id: string;
  current_mileage: number;
  updated_at: string;
}

/**
 * Bikes list response
 */
export interface BikesListDTO {
  bikes: BikeDTO[];
  total: number;
}

// ============================================================================
// Service Management
// ============================================================================

/**
 * Service record DTO
 * Derived from service_records table
 */
export interface ServiceRecordDTO {
  id: string;
  bike_id: string;
  service_date: string;
  mileage_at_service: number;
  service_type: ServiceTypeEnum;
  service_location: ServiceLocationEnum | null;
  cost: number | null;
  currency: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Command to create service record
 * Includes optional reminder creation
 */
export interface CreateServiceCommand {
  service_date: string;
  mileage_at_service: number;
  service_type: ServiceTypeEnum;
  service_location?: ServiceLocationEnum;
  cost?: number;
  notes?: string;
  create_reminder?: boolean;
  reminder_interval_km?: number;
}

/**
 * Command to update service record
 * Excludes reminder fields (used only on creation)
 */
export interface UpdateServiceCommand {
  service_date?: string;
  mileage_at_service?: number;
  service_type?: ServiceTypeEnum;
  service_location?: ServiceLocationEnum;
  cost?: number;
  notes?: string;
}

/**
 * Paginated services list response
 */
export interface ServicesListDTO {
  services: ServiceRecordDTO[];
  total: number;
  has_more: boolean;
}

/**
 * Service type breakdown for statistics
 */
export interface ServiceTypeBreakdown {
  service_type: ServiceTypeEnum;
  count: number;
  total_cost: number;
  avg_cost: number;
  percentage: number;
}

/**
 * Service location breakdown for statistics
 */
export interface ServiceLocationBreakdown {
  warsztat: {
    count: number;
    total_cost: number;
  };
  samodzielnie: {
    count: number;
    total_cost: number;
  };
}

/**
 * Timeline entry for service statistics
 */
export interface ServiceTimelineEntry {
  month: string;
  cost: number;
  services: number;
}

/**
 * Service statistics and cost analysis
 * Computed from service_records aggregations
 */
export interface ServiceStatsDTO {
  period: {
    from: string;
    to: string;
  };
  total_cost: number;
  total_services: number;
  cost_per_km: number;
  total_mileage: number;
  breakdown_by_type: ServiceTypeBreakdown[];
  breakdown_by_location: ServiceLocationBreakdown;
  timeline: ServiceTimelineEntry[];
}

// ============================================================================
// Service Reminders
// ============================================================================

/**
 * Service reminder DTO with computed fields
 * Derived from service_reminders table with additional status calculation
 */
export interface ServiceReminderDTO {
  id: string;
  bike_id: string;
  service_type: ServiceTypeEnum;
  triggered_at_mileage: number;
  interval_km: number;
  target_mileage: number | null;
  current_mileage: number;
  km_remaining: number;
  status: ReminderStatusEnum;
  completed_at: string | null;
  completed_service_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Command to create manual service reminder
 */
export interface CreateReminderCommand {
  service_type: ServiceTypeEnum;
  interval_km: number;
}

/**
 * Command to mark reminder as completed
 */
export interface CompleteReminderCommand {
  completed_service_id: string;
}

// ============================================================================
// Default Service Intervals
// ============================================================================

/**
 * Default service interval DTO
 * Derived from default_service_intervals table (read-only for users)
 */
export interface DefaultIntervalDTO {
  service_type: ServiceTypeEnum;
  default_interval_km: number;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============================================================================
// Dashboard & Analytics
// ============================================================================

/**
 * Weather summary for dashboard
 */
export interface WeatherSummaryDTO {
  location_id: string;
  current_temperature: number;
  feels_like: number;
  description: string;
  wind_speed: number;
  humidity: number;
  quick_recommendation: string;
}

/**
 * Upcoming service information for dashboard
 */
export interface UpcomingServiceDTO {
  bike_id: string;
  bike_name: string;
  service_type: ServiceTypeEnum;
  target_mileage: number;
  current_mileage: number;
  km_remaining: number;
  status: ReminderStatusEnum;
}

/**
 * Equipment status for dashboard
 */
export interface EquipmentStatusDTO {
  active_bikes_count: number;
  upcoming_services: UpcomingServiceDTO[];
  overdue_services_count: number;
}

/**
 * Community activity summary for dashboard
 */
export interface CommunityActivityDTO {
  recent_outfits_count: number;
  similar_conditions_count: number;
}

/**
 * Personalization status for dashboard
 */
export interface PersonalizationStatusDTO {
  feedback_count: number;
  personalization_active: boolean;
  thermal_adjustment: number;
  next_personalization_at: number;
}

/**
 * Complete dashboard data
 * Aggregates multiple data sources for main app view
 */
export interface DashboardDTO {
  weather_summary: WeatherSummaryDTO;
  equipment_status: EquipmentStatusDTO;
  community_activity: CommunityActivityDTO;
  personalization_status: PersonalizationStatusDTO;
}

// ============================================================================
// API Error Response Types
// ============================================================================

/**
 * Standard API error response format
 * Used across all endpoints for consistent error handling
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>; // dla błędów walidacji
  };
}

// ============================================================================
// API Query Parameters Types
// ============================================================================

/**
 * Query parameters for GET /api/recommendations
 */
export interface GetRecommendationParams {
  location_id: string;
  activity_type?: ActivityTypeEnum;
  duration_minutes?: number;
  date?: string;
}

/**
 * Query parameters for GET /api/feedbacks
 */
export interface GetFeedbacksParams {
  limit?: number;
  offset?: number;
  activity_type?: ActivityTypeEnum;
  rating?: number;
  sort?: "created_at_asc" | "created_at_desc" | "rating_asc" | "rating_desc";
}

/**
 * Query parameters for GET /api/community/outfits
 */
export interface GetCommunityOutfitsParams {
  location_id: string;
  radius_km?: number;
  temperature?: number;
  temperature_range?: number;
  activity_type?: ActivityTypeEnum;
  min_rating?: number;
  reputation_filter?: ReputationBadgeEnum;
  time_range?: number;
  sort?: "reputation" | "distance" | "created_at" | "rating";
  limit?: number;
  offset?: number;
}

/**
 * Query parameters for GET /api/bikes
 */
export interface GetBikesParams {
  status?: BikeStatusEnum;
  type?: BikeTypeEnum;
}

/**
 * Query parameters for GET /api/bikes/{bikeId}/services
 */
export interface GetServicesParams {
  service_type?: ServiceTypeEnum;
  service_location?: ServiceLocationEnum;
  limit?: number;
  offset?: number;
  from_date?: string;
  to_date?: string;
  sort?:
    | "service_date_asc"
    | "service_date_desc"
    | "mileage_asc"
    | "mileage_desc"
    | "cost_asc"
    | "cost_desc";
}

/**
 * Query parameters for GET /api/bikes/{bikeId}/services/stats
 */
export interface GetServiceStatsParams {
  period?: "month" | "quarter" | "year" | "all";
  from_date?: string;
  to_date?: string;
}

/**
 * Query parameters for GET /api/bikes/{bikeId}/reminders
 */
export interface GetRemindersParams {
  status?: "all" | "active" | "completed" | "overdue";
  service_type?: ServiceTypeEnum;
  sort?:
    | "km_remaining_asc"
    | "km_remaining_desc"
    | "created_at_asc"
    | "created_at_desc";
}

// ============================================================================
// Community ViewModels
// ============================================================================

/**
 * Community filters state - extends GetCommunityOutfitsParams with defaults
 */
export interface CommunityFiltersState {
  location_id: string;
  radius_km: number; // default: 50
  temperature?: number;
  temperature_range: number; // default: 3
  wind_speed?: number;
  activity_type?: ActivityTypeEnum;
  min_rating?: number; // 1-5
  reputation_filter?: ReputationBadgeEnum[];
  time_range: number; // default: 24 (hours)
  sort: "reputation" | "distance" | "created_at" | "rating"; // default: "reputation"
  limit: number; // default: 10
  offset: number; // default: 0
}

/**
 * Complete community view state
 */
export interface CommunityViewState {
  filters: CommunityFiltersState;
  outfits: CommunityOutfitDTO[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  selectedOutfitId: string | null;
  selectedOutfit: CommunityOutfitDTO | null;
}

/**
 * Configuration for reputation badge display
 */
export interface ReputationBadgeConfig {
  badge: ReputationBadgeEnum;
  label: string;
  color: string; // Tailwind class
  icon: string; // Lucide icon name
  minFeedbacks: number;
  maxFeedbacks: number | null;
}

/**
 * Outfit item configuration for icons and labels
 */
export interface OutfitItemConfig {
  value: string;
  label: string;
  icon: string; // Lucide icon name
  category: "head" | "torso" | "arms" | "hands" | "legs" | "feet" | "neck";
}

/**
 * Sort option configuration
 */
export interface SortOption {
  value: "reputation" | "distance" | "created_at" | "rating";
  label: string;
  icon: string; // Lucide icon name
}

/**
 * Default community filters state
 */
export const DEFAULT_COMMUNITY_FILTERS: Omit<
  CommunityFiltersState,
  "location_id"
> = {
  radius_km: 50,
  temperature_range: 3,
  time_range: 24, // 24 hours
  sort: "reputation",
  limit: 10,
  offset: 0,
};

/**
 * Sort options configuration
 */
export const SORT_OPTIONS: SortOption[] = [
  { value: "reputation", label: "Według reputacji", icon: "Award" },
  { value: "distance", label: "Według odległości", icon: "MapPin" },
  { value: "created_at", label: "Według daty", icon: "Clock" },
  { value: "rating", label: "Według oceny", icon: "Star" },
];

// ============================================================================
// Recommendations ViewModels
// ============================================================================

/**
 * Zone type for body parts in cyclist silhouette
 */
export type ZoneType =
  | "head"
  | "torso"
  | "arms"
  | "hands"
  | "legs"
  | "feet"
  | "neck";

/**
 * Recommendation filters view model
 */
export interface RecommendationFiltersViewModel {
  locationId: string;
  activityType: ActivityTypeEnum;
  durationMinutes: number;
  selectedDate: Date | null; // null = today
}

/**
 * Recommendation view state
 */
export interface RecommendationViewState {
  filters: RecommendationFiltersViewModel;
  recommendation: RecommendationDTO | null;
  aiTips: string[];
  isLoadingRecommendation: boolean;
  isLoadingAiTips: boolean;
  error: ApiError | null;
  rateLimitedUntil: Date | null;
}

/**
 * Feedback form view model
 */
export interface FeedbackFormViewModel {
  followedRecommendation: "yes" | "no";
  actualOutfit: OutfitDTO;
  overallRating: number; // 1-5
  zoneRatings: ZoneRatings;
  notes: string;
  shareWithCommunity: boolean;
}

/**
 * History filters view model
 */
export interface HistoryFiltersViewModel {
  temperatureMin: number; // -10
  temperatureMax: number; // 35
  season?: "spring" | "summer" | "autumn" | "winter";
  activityType?: ActivityTypeEnum;
  sort: "created_at_desc" | "created_at_asc" | "rating_desc" | "rating_asc";
  limit: number; // 30
  offset: number; // 0
}

// ============================================================================
// API Error Types
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  code: string; // 'VALIDATION_ERROR', 'LOCATION_NOT_FOUND', etc.
  message: string;
  statusCode: number;
  details?: { field?: string; message: string }[];
  retryAfter?: number; // for 503, 429
}
