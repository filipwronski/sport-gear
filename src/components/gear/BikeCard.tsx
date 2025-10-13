import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BikeCardStats } from "./BikeCardStats";
import * as Icons from "lucide-react";
import type { BikeCardDisplayData } from "./types";

interface BikeCardProps {
  bike: BikeCardDisplayData;
  onClick: (bikeId: string) => void;
}

export const BikeCard = ({ bike, onClick }: BikeCardProps) => {
  const TypeIcon = Icons[bike.typeIcon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
      onClick={() => onClick(bike.id)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <TypeIcon className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {bike.typeLabel}
            </span>
            <Badge variant={bike.statusBadgeVariant} className="text-xs">
              {bike.statusLabel}
            </Badge>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {bike.name}
        </h3>
        <div className="w-full h-32 bg-gray-100 rounded-md flex items-center justify-center">
          <TypeIcon className="w-12 h-12 text-gray-400" />
        </div>
      </CardHeader>

      <CardContent>
        <BikeCardStats bike={bike} />
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm font-medium text-gray-900">
          {bike.totalCostFormatted}
        </div>
        <Button variant="outline" size="sm">
          Zobacz szczegóły
        </Button>
      </CardFooter>
    </Card>
  );
};
