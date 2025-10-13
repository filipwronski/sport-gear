import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Crown,
  Shirt,
  Hand,
  ShirtIcon as TorsoIcon,
  Footprints,
  Heart
} from "lucide-react";
import type { OutfitDTO, ZoneType } from "../types";

/**
 * OutfitDetailsList - Accordion-style detailed outfit breakdown
 * Shows each body zone with specific clothing items and torso layering
 */
interface OutfitDetailsListProps {
  outfit: OutfitDTO;
  expandedZone?: ZoneType;
}

interface ZoneItem {
  zone: ZoneType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
}

export default function OutfitDetailsList({ outfit, expandedZone }: OutfitDetailsListProps) {
  const getZoneItems = (): ZoneItem[] => [
    {
      zone: "head",
      label: "Głowa",
      icon: Crown,
      content: outfit.head || "Brak"
    },
    {
      zone: "neck",
      label: "Szyja",
      icon: Heart,
      content: outfit.neck || "Brak"
    },
    {
      zone: "torso",
      label: "Tułów (3 warstwy)",
      icon: TorsoIcon,
      content: `Warstwa 1 (bielizna): ${outfit.torso.base}\nWarstwa 2 (środkowa): ${outfit.torso.mid}\nWarstwa 3 (zewnętrzna): ${outfit.torso.outer}`
    },
    {
      zone: "arms",
      label: "Ramiona",
      icon: Shirt,
      content: outfit.arms || "Brak"
    },
    {
      zone: "hands",
      label: "Dłonie",
      icon: Hand,
      content: outfit.hands || "Brak"
    },
    {
      zone: "legs",
      label: "Nogi",
      icon: Footprints,
      content: outfit.legs || "Brak"
    },
    {
      zone: "feet",
      label: "Stopy",
      icon: Footprints,
      content: outfit.feet.socks
        ? `Skarpetki: ${outfit.feet.socks}${outfit.feet.covers ? `\nOchraniacze: ${outfit.feet.covers}` : ""}`
        : "Brak"
    }
  ];

  const defaultValue = expandedZone ? [expandedZone] : [];

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Szczegóły rekomendacji</h3>

      <Accordion
        type="multiple"
        defaultValue={defaultValue}
        className="w-full"
      >
        {getZoneItems().map((item) => (
          <AccordionItem key={item.zone} value={item.zone}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="pl-6 text-sm text-muted-foreground">
                {item.zone === "torso" ? (
                  <div className="space-y-1">
                    {item.content.split("\n").map((line, index) => (
                      <div key={index} className="text-foreground">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-foreground">
                    {item.content}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
