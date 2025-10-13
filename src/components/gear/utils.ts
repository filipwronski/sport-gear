import type {
  BikeDTO,
  BikeTypeEnum,
  BikeStatusEnum,
  ServiceTypeEnum,
  ReminderStatusEnum,
} from "../../types";
import type { BikeCardDisplayData, SortOption } from "./types";

/**
 * Mapowanie typu roweru na ikonę (lucide-react)
 */
export const bikeTypeToIcon = (type: BikeTypeEnum): string => {
  const iconMap: Record<BikeTypeEnum, string> = {
    szosowy: "Bike",
    gravelowy: "Mountain",
    mtb: "TreePine",
    czasowy: "Zap",
  };
  return iconMap[type];
};

/**
 * Mapowanie typu roweru na polską etykietę
 */
export const bikeTypeToLabel = (type: BikeTypeEnum): string => {
  const labelMap: Record<BikeTypeEnum, string> = {
    szosowy: "Szosowy",
    gravelowy: "Gravelowy",
    mtb: "MTB",
    czasowy: "Czasowy",
  };
  return labelMap[type];
};

/**
 * Mapowanie statusu roweru na polską etykietę
 */
export const bikeStatusToLabel = (status: BikeStatusEnum): string => {
  const labelMap: Record<BikeStatusEnum, string> = {
    active: "Aktywny",
    archived: "Zarchiwizowany",
    sold: "Sprzedany",
  };
  return labelMap[status];
};

/**
 * Mapowanie statusu roweru na wariant Badge
 */
export const bikeStatusToBadgeVariant = (
  status: BikeStatusEnum,
): "default" | "secondary" | "outline" => {
  const variantMap: Record<BikeStatusEnum, "default" | "secondary" | "outline"> = {
    active: "default",
    archived: "secondary",
    sold: "outline",
  };
  return variantMap[status];
};

/**
 * Mapowanie typu serwisu na polską etykietę
 */
export const serviceTypeToLabel = (type: ServiceTypeEnum): string => {
  const labelMap: Record<ServiceTypeEnum, string> = {
    lancuch: "Łańcuch",
    kaseta: "Kaseta",
    klocki_przod: "Klocki przód",
    klocki_tyl: "Klocki tył",
    opony: "Opony",
    przerzutki: "Przerzutki",
    hamulce: "Hamulce",
    przeglad_ogolny: "Przegląd ogólny",
    inne: "Inne",
  };
  return labelMap[type];
};

/**
 * Mapowanie statusu przypomnienia na polską etykietę
 */
export const reminderStatusToLabel = (status: ReminderStatusEnum): string => {
  const labelMap: Record<ReminderStatusEnum, string> = {
    active: "Aktywne",
    upcoming: "Wkrótce",
    overdue: "Przeterminowane",
    completed: "Zakończone",
  };
  return labelMap[status];
};

/**
 * Mapowanie statusu przypomnienia na wariant Badge
 */
export const reminderStatusToBadgeVariant = (
  status: ReminderStatusEnum,
): "default" | "warning" | "destructive" => {
  const variantMap: Record<ReminderStatusEnum, "default" | "warning" | "destructive"> = {
    active: "default",
    upcoming: "warning",
    overdue: "destructive",
    completed: "default",
  };
  return variantMap[status];
};

/**
 * Formatowanie liczby z separatorami tysięcy
 */
export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("pl-PL").format(value);
};

/**
 * Formatowanie przebiegu (km)
 */
export const formatMileage = (km: number | null): string => {
  if (km === null || km === 0) return "0 km";
  return `${formatNumber(km)} km`;
};

/**
 * Formatowanie kosztu (PLN)
 */
export const formatCost = (amount: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(amount);
};

/**
 * Formatowanie daty
 */
export const formatDate = (dateString: string | null): string | null => {
  if (!dateString) return null;
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

/**
 * Formatowanie pozostałych kilometrów do serwisu
 */
export const formatKmRemaining = (km: number): string => {
  if (km <= 0) return "Przeterminowane";
  return `Za ${formatNumber(km)} km`;
};

/**
 * Transformacja BikeDTO do BikeCardDisplayData
 */
export const transformBikeToDisplayData = (
  bike: BikeDTO
): BikeCardDisplayData => {
  return {
    id: bike.id,
    name: bike.name,
    type: bike.type,
    typeIcon: bikeTypeToIcon(bike.type),
    typeLabel: bikeTypeToLabel(bike.type),
    status: bike.status || "active",
    statusBadgeVariant: bikeStatusToBadgeVariant(bike.status || "active"),
    statusLabel: bikeStatusToLabel(bike.status || "active"),
    currentMileage: bike.current_mileage || 0,
    mileageFormatted: formatMileage(bike.current_mileage),
    lastService: null, // TODO: implement when service data available
  nextService: bike.next_service
    ? {
        type: bike.next_service.service_type,
        typeLabel: serviceTypeToLabel(bike.next_service.service_type),
        targetMileage: bike.next_service.target_mileage,
        kmRemaining: bike.next_service.km_remaining,
        kmRemainingFormatted: formatKmRemaining(
          bike.next_service.km_remaining,
        ),
        status: bike.next_service.status,
        statusBadgeVariant: reminderStatusToBadgeVariant(
          bike.next_service.status,
        ),
        statusLabel: reminderStatusToLabel(bike.next_service.status),
      }
    : null,
    activeRemindersCount: bike.active_reminders_count,
    totalCost: bike.total_cost,
    totalCostFormatted: formatCost(bike.total_cost),
    hasImage: false, // TODO: implement when image handling ready
    imagePlaceholder: "/placeholder-bike.svg",
  };
};

/**
 * Filtrowanie rowerów według filtrów
 */
export const filterBikes = (
  bikes: BikeDTO[],
  filters: { status: BikeStatusEnum | "all"; type: BikeTypeEnum | "all" },
  searchQuery: string,
): BikeDTO[] => {
  let filtered = bikes;

  // Filtr statusu
  if (filters.status !== "all") {
    filtered = filtered.filter((bike) => bike.status === filters.status);
  }

  // Filtr typu
  if (filters.type !== "all") {
    filtered = filtered.filter((bike) => bike.type === filters.type);
  }

  // Wyszukiwanie po nazwie
  if (searchQuery.trim() !== "") {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((bike) =>
      bike.name.toLowerCase().includes(query)
    );
  }

  return filtered;
};

/**
 * Sortowanie rowerów
 */
export const sortBikes = (
  bikes: BikeDTO[],
  sortBy: SortOption,
): BikeDTO[] => {
  const sorted = [...bikes];

  switch (sortBy) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "pl"));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, "pl"));
    case "mileage_asc":
      return sorted.sort(
        (a, b) => (a.current_mileage || 0) - (b.current_mileage || 0)
      );
    case "mileage_desc":
      return sorted.sort(
        (a, b) => (b.current_mileage || 0) - (a.current_mileage || 0)
      );
    case "created_at_asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
      );
    case "created_at_desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      );
    default:
      return sorted;
  }
};
