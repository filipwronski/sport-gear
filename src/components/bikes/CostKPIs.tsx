import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceStatsDTO } from "../../types";

interface CostKPIsProps {
  stats: ServiceStatsDTO;
}

export function CostKPIs({ stats }: CostKPIsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Cost
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.total_cost.toFixed(2)} PLN
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Period: {new Date(stats.period.from).toLocaleDateString()} -{" "}
            {new Date(stats.period.to).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_services}</div>
          <p className="text-xs text-gray-500 mt-1">Service records</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Cost per KM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.cost_per_km.toFixed(2)} PLN
          </div>
          <p className="text-xs text-gray-500 mt-1">Average maintenance cost</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Total Mileage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.total_mileage.toFixed(0)} km
          </div>
          <p className="text-xs text-gray-500 mt-1">During period</p>
        </CardContent>
      </Card>
    </div>
  );
}
