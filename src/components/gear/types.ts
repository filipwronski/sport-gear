import type { BikeDTO, BikeStatusEnum, BikeTypeEnum } from "../../types";

/**
 * Filtry dla listy rowerów
 */
export interface BikeFilters {
  status: BikeStatusEnum | "all"; // "all" dla braku filtra
  type: BikeTypeEnum | "all"; // "all" dla braku filtra
}

/**
 * Opcje sortowania listy rowerów
 */
export type SortOption =
  | "name_asc"
  | "name_desc"
  | "mileage_asc"
  | "mileage_desc"
  | "created_at_asc"
  | "created_at_desc";

/**
 * Stan widoku listy rowerów
 */
export interface BikeListState {
  bikes: BikeDTO[];
  filteredBikes: BikeDTO[];
  isLoading: boolean;
  error: Error | null;
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  isAddDialogOpen: boolean;
}

/**
 * Metadata wyświetlania kart rowerów
 */
export interface BikeCardDisplayData {
  id: string;
  name: string;
  type: BikeTypeEnum;
  typeIcon: string; // nazwa ikony z lucide-react
  typeLabel: string; // polskie oznaczenie
  status: BikeStatusEnum;
  statusBadgeVariant: "default" | "secondary" | "outline"; // wariant Badge
  statusLabel: string; // polskie oznaczenie
  currentMileage: number;
  mileageFormatted: string; // np. "5 420 km"
  lastService: {
    date: string | null;
    dateFormatted: string | null; // np. "15 maja 2024"
    type: string | null;
    typeLabel: string | null; // polskie oznaczenie
  } | null;
  nextService: {
    type: string;
    typeLabel: string; // polskie oznaczenie
    targetMileage: number;
    kmRemaining: number;
    kmRemainingFormatted: string; // np. "Za 580 km"
    status: import("../../types").ReminderStatusEnum;
    statusBadgeVariant: "default" | "warning" | "destructive";
    statusLabel: string; // "Wkrótce" | "Do zrobienia" | "Przeterminowane"
  } | null;
  activeRemindersCount: number;
  totalCost: number;
  totalCostFormatted: string; // np. "1 250,50 zł"
  hasImage: boolean;
  imagePlaceholder: string; // URL lub ścieżka do placeholder
}

/**
 * Dane dla select/dropdown typów roweru
 */
export interface BikeTypeOption {
  value: BikeTypeEnum | "all";
  label: string; // polskie oznaczenie
  icon: string; // nazwa ikony z lucide-react
}

/**
 * Dane dla select/dropdown statusów roweru
 */
export interface BikeStatusOption {
  value: BikeStatusEnum | "all";
  label: string; // polskie oznaczenie
}

/**
 * Dane dla select/dropdown sortowania
 */
export interface SortOptionData {
  value: SortOption;
  label: string; // polskie oznaczenie
}

/**
 * Hook state dla zarządzania listą rowerów
 */
export interface UseBikeListReturn {
  bikes: BikeDTO[];
  displayBikes: BikeCardDisplayData[]; // przetworzone do wyświetlenia
  isLoading: boolean;
  error: Error | null;
  filters: BikeFilters;
  sortBy: SortOption;
  searchQuery: string;
  totalCount: number;
  isAddDialogOpen: boolean;
  setFilters: (filters: BikeFilters) => void;
  setSortBy: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  openAddDialog: () => void;
  closeAddDialog: () => void;
  addBike: (data: import("../../types").CreateBikeCommand) => Promise<void>;
  refetchBikes: () => Promise<void>;
  handleBikeClick: (bikeId: string) => void;
}
