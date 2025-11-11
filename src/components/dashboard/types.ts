// ============================================================================
// Dashboard Component Types
// ============================================================================

import type { DashboardDTO, ApiErrorResponse, LocationDTO } from "../../types";

// ============================================================================
// Props Types
// ============================================================================

export interface DashboardContainerProps {
  userId: string;
  initialLocationId?: string;
}

export interface NavbarProps {
  userId: string;
}

export interface WeatherSectionProps {
  data: DashboardDTO["weather_summary"];
  lastRefresh?: Date;
  currentLocationId?: string;
  userLocations?: LocationDTO[];
  isLoadingLocations?: boolean;
  onLocationChange?: (locationId: string | null) => void;
}

export interface EquipmentStatusSectionProps {
  data: DashboardDTO["equipment_status"];
}

export interface CommunityActivitySectionProps {
  data: DashboardDTO["community_activity"];
}

export interface PersonalizationStatusSectionProps {
  data: DashboardDTO["personalization_status"];
}

export interface QuickActionsBarProps {
  currentLocationId?: string;
}

export interface ErrorDisplayProps {
  error: Error | ApiErrorResponse;
  onRetry: () => void;
}

// ============================================================================
// State Types
// ============================================================================

export interface DashboardState {
  data: DashboardDTO | null;
  isLoading: boolean;
  error: Error | null;
  lastRefresh: Date | null;
}

// ============================================================================
// Custom Hook Return Types
// ============================================================================

export interface UseDashboardDataReturn {
  data: DashboardDTO | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastRefresh: Date | null;
}

export interface UseAutoRefreshOptions {
  enabled: boolean;
  intervalMs: number;
  onRefresh: () => void;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}

// ============================================================================
// Service Status Types
// ============================================================================

export type ServiceStatusVariant =
  | "upcoming"
  | "active"
  | "overdue"
  | "completed";

export interface ServiceStatusBadgeProps {
  status: ServiceStatusVariant;
  kmRemaining?: number;
}

// ============================================================================
// Location Types
// ============================================================================

export interface LocationOption {
  id: string;
  label: string;
  city: string;
  isDefault: boolean;
}

// ============================================================================
// Error Handling Types
// ============================================================================

export enum DashboardErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  LOCATION_NOT_FOUND = "LOCATION_NOT_FOUND",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN = "UNKNOWN",
}

export const WEATHER_REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes

// ============================================================================
// Navigation Constants
// ============================================================================

export const NAVIGATION_ITEMS: Omit<NavigationItem, "isActive">[] = [
  { label: "Dashboard", href: "/dashboard", icon: undefined },
  { label: "Rekomendacje", href: "/recommendations", icon: undefined },
  { label: "Społeczność", href: "/community", icon: undefined },
  { label: "Sprzęt", href: "/bikes", icon: undefined },
];
