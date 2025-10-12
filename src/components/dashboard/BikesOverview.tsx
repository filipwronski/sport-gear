import { Bike } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BikesOverviewProps {
  count: number;
}

export function BikesOverview({ count }: BikesOverviewProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Bike className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-sm text-muted-foreground">
              {count === 1 ? "Aktywny rower" : "Aktywne rowery"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
