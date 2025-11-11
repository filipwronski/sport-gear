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
            Łączny koszt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.total_cost || 0).toFixed(2)} PLN
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Period:{" "}
            {stats.period?.from
              ? new Date(stats.period.from).toLocaleDateString()
              : "N/A"}{" "}
            -{" "}
            {stats.period?.to
              ? new Date(stats.period.to).toLocaleDateString()
              : "N/A"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Liczba serwisów
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_services || 0}</div>
          <p className="text-xs text-gray-500 mt-1">Rekordy serwisowe</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Koszt na km
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.cost_per_km || 0).toFixed(2)} PLN
          </div>
          <p className="text-xs text-gray-500 mt-1">Średni koszt konserwacji</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            Łączny przebieg
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(stats.total_mileage || 0).toFixed(0)} km
          </div>
          <p className="text-xs text-gray-500 mt-1">W okresie</p>
        </CardContent>
      </Card>
    </div>
  );
}
