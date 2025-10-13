import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { OutfitDTO, ZoneType } from "../types";

/**
 * CyclistSVG - Interactive cyclist silhouette with clickable zones
 * Shows 7 body zones with color coding based on thermal comfort
 */
interface CyclistSVGProps {
  outfit: OutfitDTO;
  selectedZone?: ZoneType;
  onZoneClick?: (zone: ZoneType) => void;
}

interface ZoneConfig {
  id: ZoneType;
  label: string;
  path: string;
  ariaLabel: string;
}

const ZONES: ZoneConfig[] = [
  {
    id: "head",
    label: "Głowa",
    path: "M100,50 Q110,45 120,50 Q125,60 120,70 Q110,75 100,70 Q95,60 100,50 Z",
    ariaLabel: "Strefa głowy"
  },
  {
    id: "torso",
    label: "Tułów",
    path: "M90,70 Q95,80 100,90 Q105,100 110,110 Q115,120 120,130 Q125,140 130,150 Q135,160 130,170 Q120,175 110,170 Q100,165 90,160 Q85,150 80,140 Q75,130 80,120 Q85,110 90,100 Q95,90 100,80 Z",
    ariaLabel: "Strefa tułowia"
  },
  {
    id: "arms",
    label: "Ramiona",
    path: "M70,80 Q60,85 50,90 Q45,95 40,100 Q35,105 30,110 Q25,115 30,120 Q35,125 40,120 Q45,115 50,110 Q55,105 60,100 Q65,95 70,90 Z M130,80 Q140,85 150,90 Q155,95 160,100 Q165,105 170,110 Q175,115 170,120 Q165,125 160,120 Q155,115 150,110 Q145,105 140,100 Q135,95 130,90 Z",
    ariaLabel: "Strefy ramion"
  },
  {
    id: "hands",
    label: "Dłonie",
    path: "M20,115 Q15,120 10,125 Q5,130 10,135 Q15,140 20,135 Z M180,115 Q185,120 190,125 Q195,130 190,135 Q185,140 180,135 Z",
    ariaLabel: "Strefy dłoni"
  },
  {
    id: "legs",
    label: "Nogi",
    path: "M85,170 Q80,180 85,190 Q90,200 95,210 Q100,220 105,230 Q110,240 115,230 Q120,220 115,210 Q110,200 105,190 Q100,180 95,170 Z M105,170 Q110,180 105,190 Q100,200 95,210 Q90,220 85,230 Q80,240 75,230 Q70,220 75,210 Q80,200 85,190 Q90,180 95,170 Z",
    ariaLabel: "Strefy nóg"
  },
  {
    id: "feet",
    label: "Stopy",
    path: "M80,240 Q75,245 70,250 Q65,255 70,260 Q75,265 80,260 Z M120,240 Q125,245 130,250 Q135,255 130,260 Q125,265 120,260 Z",
    ariaLabel: "Strefy stóp"
  },
  {
    id: "neck",
    label: "Szyja",
    path: "M100,50 Q105,45 110,50 Q115,55 110,60 Q105,65 100,60 Z",
    ariaLabel: "Strefa szyi"
  }
];

export default function CyclistSVG({ outfit, selectedZone, onZoneClick }: CyclistSVGProps) {
  const [hoveredZone, setHoveredZone] = useState<ZoneType | null>(null);

  const getZoneColor = (zone: ZoneType): string => {
    const item = outfit[zone];

    // Handle different zone types
    let itemString = "";
    if (typeof item === "string") {
      itemString = item;
    } else if (zone === "torso" && item && typeof item === "object") {
      itemString = item.outer || item.mid || item.base || "";
    } else if (zone === "feet" && item && typeof item === "object") {
      itemString = item.socks || "";
    }

    if (!itemString || itemString === "nic") return "fill-red-500 hover:fill-red-600"; // No protection

    // Simple thermal comfort logic
    if (zone === "head" && (itemString.includes("czapka") || itemString.includes("kask"))) {
      return "fill-blue-500 hover:fill-blue-600"; // Cold protection
    }
    if (zone === "hands" && itemString.includes("rękawiczki")) {
      return "fill-blue-500 hover:fill-blue-600"; // Cold protection
    }
    if (zone === "feet" && itemString.includes("skarpetki")) {
      return "fill-blue-500 hover:fill-blue-600"; // Cold protection
    }
    if (zone === "torso" && outfit.torso?.outer) {
      return "fill-green-500 hover:fill-green-600"; // Good protection
    }

    return "fill-green-500 hover:fill-green-600"; // Default good protection
  };

  const getZoneTooltip = (zone: ZoneType): string => {
    const item = outfit[zone];
    if (!item || item === "nic") return `${ZONES.find(z => z.id === zone)?.label}: Brak ochrony`;

    if (zone === "torso") {
      return `Tułów: ${outfit.torso.base} / ${outfit.torso.mid} / ${outfit.torso.outer}`;
    }
    if (zone === "feet") {
      return `Stopy: ${outfit.feet.socks}${outfit.feet.covers ? ` + ${outfit.feet.covers}` : ""}`;
    }

    return `${ZONES.find(z => z.id === zone)?.label}: ${item}`;
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
          viewBox="0 0 200 280"
          className="w-full max-w-xs mx-auto"
          role="img"
          aria-label="Interaktywna sylwetka kolarza z strefami ciała"
        >
          {/* Bike frame (simple representation) */}
          <path
            d="M30,200 Q50,190 70,200 Q90,210 110,200 Q130,190 150,200 Q170,210 180,220"
            fill="none"
            stroke="#666"
            strokeWidth="2"
          />

          {/* Wheels */}
          <circle cx="60" cy="220" r="20" fill="none" stroke="#666" strokeWidth="2" />
          <circle cx="140" cy="220" r="20" fill="none" stroke="#666" strokeWidth="2" />

          {/* Body zones */}
          {ZONES.map((zone) => (
            <Tooltip key={zone.id}>
              <TooltipTrigger asChild>
                <path
                  d={zone.path}
                  className={`${getZoneColor(zone.id)} cursor-pointer transition-colors ${
                    selectedZone === zone.id ? "stroke-2 stroke-primary" : ""
                  }`}
                  onClick={() => handleZoneClick(zone.id)}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                  onKeyDown={(e) => handleKeyDown(zone.id, e)}
                  role="button"
                  tabIndex={0}
                  aria-label={zone.ariaLabel}
                  aria-pressed={selectedZone === zone.id}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{getZoneTooltip(zone.id)}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </svg>

        {/* Zone labels (optional - shown when zone is selected) */}
        {selectedZone && (
          <div className="absolute bottom-0 left-0 right-0 text-center text-sm font-medium text-muted-foreground">
            Wybrana strefa: {ZONES.find(z => z.id === selectedZone)?.label}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
