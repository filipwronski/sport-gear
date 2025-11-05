import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  ClothingRecommendationDTO,
  ZoneType,
  ClothingItem,
} from "../types";

/**
 * HumanFigureSVG - Interactive human figure silhouette with clean contour lines and clickable zones
 * Shows 7 body zones with color coding based on recommended clothing items
 */
interface CyclistSVGProps {
  recommendation: ClothingRecommendationDTO;
  selectedZone?: ZoneType;
  onZoneClick?: (zone: ZoneType) => void;
}

// Definicje stref do ręcznego pozycjonowania
const ZONE_DEFINITIONS = [
  {
    id: "head" as ZoneType,
    label: "Głowa",
    count: 3,
    ariaLabel: "Strefa głowy",
  },
  {
    id: "neck" as ZoneType,
    label: "Szyja",
    count: 1,
    ariaLabel: "Strefa szyi",
  },
  {
    id: "torso" as ZoneType,
    label: "Tułów",
    count: 5,
    ariaLabel: "Strefa tułowia",
  },
  {
    id: "arms" as ZoneType,
    label: "Ramiona",
    count: 6,
    ariaLabel: "Strefy ramion",
  },
  {
    id: "hands" as ZoneType,
    label: "Dłonie",
    count: 2,
    ariaLabel: "Strefy dłoni",
  },
  {
    id: "legs" as ZoneType,
    label: "Nogi",
    count: 6,
    ariaLabel: "Strefy nóg",
  },
  {
    id: "feet" as ZoneType,
    label: "Stopy",
    count: 2,
    ariaLabel: "Strefy stóp",
  },
];

// Możesz ręcznie zmieniać pozycje punktów poniżej
const ZONE_POSITIONS: Record<ZoneType, { x: number; y: number }[]> = {
  head: [
    { x: 150, y: 25 }, // czubek głowy
  ],
  neck: [{ x: 150, y: 55 }], // środek szyi
  torso: [
    { x: 150, y: 70 }, // górny środek tułowia
    { x: 150, y: 110 }, // środkowy tułów
    { x: 150, y: 150 }, // dolny tułów
  ],
  arms: [
    { x: 110, y: 75 }, // lewe ramię górne
    { x: 110, y: 110 }, // lewe ramię środkowe
    { x: 100, y: 150 }, // lewe ramię dolne
    { x: 190, y: 75 }, // prawe ramię górne
    { x: 190, y: 110 }, // prawe ramię środkowe
    { x: 200, y: 150 }, // prawe ramię dolne
  ],
  hands: [
    { x: 90, y: 200 }, // lewa dłoń
    { x: 210, y: 200 }, // prawa dłoń
  ],
  legs: [
    { x: 130, y: 225 }, // lewa noga górna
    { x: 130, y: 275 }, // lewa noga środkowa
    { x: 130, y: 315 }, // lewa noga dolna
    { x: 170, y: 225 }, // prawa noga górna
    { x: 170, y: 275 }, // prawa noga środkowa
    { x: 170, y: 315 }, // prawa noga dolna
  ],
  feet: [
    { x: 130, y: 360 }, // lewa stopa
    { x: 170, y: 360 }, // prawa stopa
  ],
};

export default function CyclistSVG({
  recommendation,
  selectedZone,
  onZoneClick,
}: CyclistSVGProps) {
  // Helper function to check if a zone has recommended items
  const isZoneRecommended = (zone: ZoneType): boolean => {
    // Arms are always covered in cycling clothing
    if (zone === "arms") {
      return true;
    }

    const zoneItems = getZoneItems(zone);
    return zoneItems.length > 0;
  };

  // Get items for a specific zone
  const getZoneItems = (zone: ZoneType): ClothingItem[] => {
    return recommendation.items.filter((item) => {
      switch (zone) {
        case "head":
          return item === "czapka";
        case "neck":
          return item === "komin na szyję";
        case "torso":
          return (
            item === "koszulka termoaktywna" ||
            item === "bluza" ||
            item === "kurtka" ||
            item === "kurtka przeciwwiatrowa" ||
            item === "kurtka zimowa" ||
            item === "kamizelka przeciwwiatrowa"
          );
        case "arms":
          return item === "rękawki";
        case "hands":
          return (
            item === "rękawiczki letnie" ||
            item === "rękawiczki jesienne" ||
            item === "rękawiczki zimowe"
          );
        case "legs":
          return (
            item === "nogawki" ||
            item === "krótkie spodenki" ||
            item === "długie spodnie"
          );
        case "feet":
          return item === "noski na buty" || item === "ochraniacze na buty";
        default:
          return false;
      }
    });
  };

  const getZoneColor = (zone: ZoneType): string => {
    const isRecommended = isZoneRecommended(zone);

    if (isRecommended) {
      return "fill-green-400/80 hover:fill-green-500"; // Recommended zones - green highlight
    }

    return "fill-gray-300/40 hover:fill-gray-400/60"; // Not recommended - neutral gray
  };

  const getZoneTooltip = (zone: ZoneType): string => {
    const zoneItems = getZoneItems(zone);
    const zoneDef = ZONE_DEFINITIONS.find((z) => z.id === zone);

    // Special handling for arms - always covered, may have additional sleeves
    if (zone === "arms") {
      if (zoneItems.length > 0) {
        return `${zoneDef?.label}: ${zoneItems.join(", ")} (ramiona zawsze zakryte)`;
      } else {
        return `${zoneDef?.label}: Ramiona zawsze zakryte przez ubranie`;
      }
    }

    if (zoneItems.length === 0) {
      return `${zoneDef?.label}: Brak rekomendacji`;
    }

    return `${zoneDef?.label}: ${zoneItems.join(", ")}`;
  };

  const handleZoneClick = (zone: ZoneType) => {
    if (onZoneClick) {
      onZoneClick(zone);
    }
  };

  const handleKeyDown = (zone: ZoneType, event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleZoneClick(zone);
    }
  };

  return (
    <TooltipProvider>
      <div className="relative">
        <svg
          viewBox="0 0 300 400"
          className="w-full max-w-xs mx-auto"
          role="img"
          aria-label="Interaktywna sylwetka człowieka na podstawie person.svg"
        >
          {/* Person SVG as background */}
          <g transform="translate(-13, 0) scale(0.8)">
            <path
              d="m 299.93025,250.40505 c -1.262,-1.553 -3.809,-7.505 -4.947,-9.476 -1.137,-1.971 -5.383,-8.623 -8.642,-11.732 -0.805,-0.767 -1.614,-1.314 -2.376,-1.704 -2.358,-5.41 -5.223,-27.173 -6.835,-43.725 -1.706,-17.512 -7.278,-24.449 -7.278,-24.449 0.796,-14.328 -3.98,-29.225 -3.828,-32.75 0.152,-3.525 0,-14.518 0,-14.518 -0.834,-18.042996 -10.386,-21.529996 -20.772,-24.865996 -10.386,-3.336 -23.046,-9.704 -24.942,-11.371 -1.895,-1.668 -1.895,-4.397 -1.971,-8.87 -0.073,-4.328 1.768,-8.941 3.261,-14.18 4.019,-0.095 6.389,-12.164 4.395,-13.263 -0.719,-0.397 -1.259,-0.427 -1.661,-0.29 0.631,-6.139 0.366,-13.052 -2.584,-18.435 -5.61,-10.234 -16.527,-9.855 -16.527,-9.855 h -0.958 c 0,0 -10.917,-0.379 -16.527,9.855 -2.951,5.383 -3.215,12.295 -2.584,18.435 -0.402,-0.137 -0.942,-0.107 -1.661,0.29 -1.993,1.1 0.376,13.168 4.396,13.263 1.493,5.239 3.335,9.852 3.261,14.18 -0.076,4.473 -0.076,7.202 -1.971,8.87 -1.895,1.668 -14.556,8.036 -24.942,11.371 -10.386,3.336 -19.938,6.823 -20.772,24.865996 0,0 -0.152,10.993 0,14.518 0.152,3.525 -4.624,18.422 -3.828,32.75 0,0 -5.572,6.937 -7.278,24.449 -1.612,16.552 -4.477,38.315 -6.835,43.725 -0.762,0.39 -1.571,0.937 -2.376,1.704 -3.26,3.108 -7.505,9.761 -8.642,11.732 -1.137,1.971 -3.685,7.923 -4.947,9.476 -1.478,1.819 -1.275,4.503 1.365,3.241 2.615,-1.251 5.25,-4.302 6.311,-6.122 1.061,-1.82 1.819,-2.274 1.819,-2.274 0,0 -1.411,11.921 -1.804,15.543 -0.436,4.018 -1.949,9.513 0.136,10.081 2.291,0.625 2.881,-2.426 3.26,-4.776 0.379,-2.35 2.732,-13.647 3.479,-14.328 0.932,-0.849 0.521,0.467 0.311,3.184 -0.071,0.919 -0.379,5.534 -0.834,8.491 -0.455,2.957 -1.971,9.552 1.213,9.173 3.184,-0.379 3.942,-18.194 4.473,-19.483 0.531,-1.289 0.986,-0.758 0.682,2.426 -0.096,1.007 -1.744,12.964 -1.137,15.389 0.607,2.426 2.957,2.047 3.715,-1.061 0.758,-3.108 1.516,-15.693 2.047,-16.602 0.531,-0.91 0.682,0.758 0.53,3.033 -0.111,1.664 -1.061,10.765 0.758,11.144 1.819,0.379 2.559,-0.739 3.063,-7.391 0.442,-5.825 0.5,-9.06 0.803,-12.774 0.303,-3.715 0.682,-14.631 -1.137,-17.967 0,0 2.274,-11.22 6.974,-20.924 4.7,-9.704 11.675,-26.685 11.371,-35.024 -0.252,-6.925 5.56,-30.995 7.712,-39.134 0.204,2.029 0.501,4.178 0.93,6.384 2.123,10.917 5.307,24.108 4.852,32.295 -0.455,8.188 -1.365,20.62 -2.274,25.472 -0.91,4.852 -6.368,23.653 -6.217,46.851 0.152,23.198 3.336,50.565 4.852,56.327 1.516,5.762 1.953,11.472 1.498,15.414 -0.455,3.942 -1.347,12.711 -0.437,18.625 0,0 -3.639,15.465 -0.758,36.54 2.881,21.075 8.036,44.273 8.036,46.699 0,0.217 0,0.547 0,0.964 -0.248,1.131 -0.522,2.257 -0.771,3.388 -0.3,1.368 -0.502,2.736 -0.54,4.138 -0.037,1.386 0.041,2.768 0.065,4.154 0.017,0.971 -0.01,1.941 -0.104,2.906 -0.697,1.414 -1.537,2.774 -2.398,4.075 -1.169,1.766 -2.491,3.424 -3.835,5.058 -1.357,1.65 -2.742,3.277 -4.036,4.977 -0.643,0.845 -1.264,1.707 -1.846,2.596 -0.607,0.926 -1.293,1.9 -1.509,3.007 -0.2,1.021 0.09,2.051 1.062,2.536 0.194,0.097 0.4,0.158 0.606,0.185 -0.026,0.313 -0.007,0.632 0.083,0.962 0.33,1.207 1.559,2.076 2.796,2.111 0.167,0.576 0.591,1.013 1.248,1.201 0.804,0.229 1.677,-0.011 2.395,-0.427 0.036,0.184 0.095,0.364 0.184,0.538 0.448,0.876 1.448,1.251 2.388,1.223 1.111,-0.034 2.054,-0.688 2.793,-1.472 0.383,-0.406 0.731,-0.841 1.078,-1.274 -0.146,0.585 -0.159,1.196 0.058,1.765 0.405,1.06 1.557,1.595 2.616,1.745 1.005,0.143 2.021,-0.059 2.925,-0.51 0.347,-0.173 0.702,-0.394 1.032,-0.654 0.619,-0.304 1.183,-0.746 1.664,-1.224 1.07,-1.062 1.808,-2.384 2.364,-3.773 1.232,-3.076 1.628,-6.418 2.271,-9.647 0.121,-0.607 0.247,-1.22 0.386,-1.831 0.08,0.055 0.206,0.049 0.315,-0.061 1.379,-1.399 1.911,-3.663 2.076,-5.558 0.202,-2.323 -0.152,-4.641 -0.582,-6.918 -0.456,-2.417 -0.907,-4.826 -1.193,-7.271 -0.285,-2.443 -0.442,-4.898 -0.559,-7.353 -0.064,-1.35 -0.122,-2.7 -0.18,-4.05 -0.004,-0.099 -0.01,-0.198 -0.014,-0.297 0.276,-3.749 0.595,-7.4 0.958,-10.521 1.516,-13.039 6.823,-34.721 5.458,-45.941 -1.365,-11.22 0.298,-39.876 1.744,-48.064 1.446,-8.188 8.415,-54.28 6.899,-67.471 l 1.692,-0.154 1.692,0.154 c -1.516,13.191 5.453,59.284 6.899,67.471 1.446,8.187 3.108,36.844 1.744,48.064 -1.365,11.22 3.942,32.902 5.458,45.941 0.363,3.121 0.682,6.773 0.958,10.521 -0.005,0.099 -0.01,0.198 -0.015,0.297 -0.058,1.35 -0.116,2.7 -0.18,4.05 -0.116,2.456 -0.274,4.911 -0.559,7.353 -0.286,2.445 -0.737,4.853 -1.193,7.271 -0.43,2.277 -0.784,4.595 -0.582,6.918 0.165,1.895 0.696,4.158 2.076,5.558 0.109,0.11 0.235,0.117 0.315,0.061 0.139,0.611 0.265,1.224 0.386,1.831 0.643,3.229 1.039,6.571 2.271,9.647 0.556,1.39 1.294,2.711 2.364,3.773 0.482,0.478 1.045,0.92 1.664,1.224 0.33,0.259 0.685,0.48 1.032,0.654 0.904,0.452 1.92,0.653 2.925,0.51 1.059,-0.151 2.211,-0.685 2.616,-1.745 0.217,-0.569 0.204,-1.18 0.058,-1.765 0.347,0.434 0.694,0.868 1.078,1.274 0.74,0.784 1.682,1.438 2.794,1.472 0.94,0.029 1.94,-0.346 2.388,-1.223 0.089,-0.174 0.148,-0.354 0.184,-0.538 0.718,0.416 1.591,0.656 2.395,0.427 0.657,-0.188 1.08,-0.625 1.248,-1.201 1.237,-0.035 2.466,-0.903 2.796,-2.111 0.09,-0.33 0.109,-0.65 0.083,-0.962 0.206,-0.028 0.412,-0.089 0.607,-0.185 0.972,-0.485 1.262,-1.516 1.062,-2.536 -0.216,-1.107 -0.902,-2.081 -1.509,-3.007 -0.582,-0.888 -1.203,-1.751 -1.846,-2.596 -1.294,-1.7 -2.679,-3.327 -4.036,-4.977 -1.344,-1.634 -2.666,-3.293 -3.835,-5.058 -0.861,-1.301 -1.701,-2.661 -2.398,-4.075 -0.093,-0.964 -0.12,-1.934 -0.104,-2.906 0.024,-1.385 0.102,-2.768 0.065,-4.154 -0.038,-1.402 -0.239,-2.77 -0.54,-4.138 -0.248,-1.131 -0.523,-2.257 -0.771,-3.388 0,-0.418 0,-0.748 0,-0.964 0,-2.426 5.155,-25.624 8.036,-46.699 2.881,-21.075 -0.758,-36.54 -0.758,-36.54 0.91,-5.913 0.018,-14.682 -0.437,-18.625 -0.455,-3.942 -0.018,-9.653 1.498,-15.414 1.516,-5.761 4.7,-33.129 4.852,-56.327 0.152,-23.198 -5.307,-41.999 -6.216,-46.851 -0.91,-4.852 -1.819,-17.285 -2.274,-25.472 -0.455,-8.188 2.729,-21.378 4.852,-32.295 0.429,-2.205 0.726,-4.355 0.93,-6.384 2.152,8.139 7.964,32.209 7.712,39.134 -0.303,8.339 6.671,25.321 11.371,35.024 4.7,9.704 6.975,20.924 6.975,20.924 -1.82,3.336 -1.44,14.252 -1.137,17.967 0.303,3.715 0.361,6.949 0.803,12.774 0.505,6.652 1.244,7.77 3.064,7.391 1.819,-0.379 0.87,-9.48 0.758,-11.144 -0.152,-2.275 0,-3.942 0.53,-3.033 0.531,0.91 1.289,13.494 2.047,16.602 0.758,3.108 3.108,3.487 3.715,1.061 0.607,-2.426 -1.041,-14.383 -1.137,-15.389 -0.303,-3.184 0.152,-3.715 0.682,-2.426 0.531,1.289 1.289,19.104 4.473,19.483 3.184,0.379 1.668,-6.216 1.213,-9.173 -0.455,-2.957 -0.763,-7.571 -0.834,-8.491 -0.21,-2.717 -0.621,-4.033 0.311,-3.184 0.748,0.681 3.1,11.978 3.479,14.328 0.379,2.35 0.969,5.401 3.26,4.776 2.085,-0.569 0.572,-6.063 0.136,-10.081 -0.393,-3.622 -1.804,-15.543 -1.804,-15.543 0,0 0.758,0.455 1.82,2.274 1.061,1.819 3.696,4.871 6.311,6.122 2.644,1.262 2.847,-1.422 1.369,-3.241 z"
              fill="#e5e7eb"
              stroke="#374151"
              strokeWidth="1"
            />
          </g>

          {/* Interaktywne punkty stref */}
          {ZONE_DEFINITIONS.map((zoneDef) => {
            const positions = ZONE_POSITIONS[zoneDef.id] || [];
            return (
              <g key={zoneDef.id}>
                {Array.from({ length: zoneDef.count }, (_, pointIndex) => {
                  const point = positions[pointIndex];
                  if (!point) return null;

                  return (
                    <Tooltip key={`${zoneDef.id}-${pointIndex}`}>
                      <TooltipTrigger asChild>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="6"
                          className={`${getZoneColor(zoneDef.id)} transition-all duration-200 ${
                            selectedZone === zoneDef.id
                              ? "stroke-2 stroke-primary"
                              : "stroke-white stroke-1"
                          }`}
                          onClick={() => handleZoneClick(zoneDef.id)}
                          onKeyDown={(e) => handleKeyDown(zoneDef.id, e)}
                          role="button"
                          tabIndex={0}
                          aria-label={`${zoneDef.ariaLabel} - punkt ${pointIndex + 1}`}
                          aria-pressed={selectedZone === zoneDef.id}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getZoneTooltip(zoneDef.id)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Zone labels (optional - shown when zone is selected) */}
        {selectedZone && (
          <div className="absolute bottom-0 left-0 right-0 text-center text-sm font-medium text-muted-foreground">
            Wybrana strefa:{" "}
            {ZONE_DEFINITIONS.find((z) => z.id === selectedZone)?.label}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
