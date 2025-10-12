import { Users, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ActivityStatsProps {
  recentCount: number;
  similarCount: number;
}

export function ActivityStats({
  recentCount,
  similarCount,
}: ActivityStatsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{recentCount}</p>
              <p className="text-xs text-muted-foreground">
                Nowych
                <br />
                zestawów
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MapPin className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold">{similarCount}</p>
              <p className="text-xs text-muted-foreground">
                Podobne
                <br />
                warunki
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
