import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceStatsDTO } from "../../types";

interface CostLocationBreakdownProps {
  stats: ServiceStatsDTO;
}

export function CostLocationBreakdown({ stats }: CostLocationBreakdownProps) {
  const {
    warsztat = { count: 0, total_cost: 0 },
    samodzielnie = { count: 0, total_cost: 0 },
  } = stats.breakdown_by_location || {};
  const totalCost = warsztat.total_cost + samodzielnie.total_cost;
  const totalCount = warsztat.count + samodzielnie.count;

  const warsztatPercentage =
    totalCost > 0 ? (warsztat.total_cost / totalCost) * 100 : 0;
  const samodzielniePercentage =
    totalCost > 0 ? (samodzielnie.total_cost / totalCost) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Koszty wg lokalizacji</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Visual breakdown */}
          <div className="flex h-8 rounded-lg overflow-hidden">
            {warsztatPercentage > 0 && (
              <div
                className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${warsztatPercentage}%` }}
                title={`Warsztat: ${warsztat.total_cost} PLN`}
              >
                {warsztatPercentage > 15 && "Warsztat"}
              </div>
            )}
            {samodzielniePercentage > 0 && (
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${samodzielniePercentage}%` }}
                title={`Samodzielnie: ${samodzielnie.total_cost} PLN`}
              >
                {samodzielniePercentage > 15 && "Samodzielnie"}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="font-medium text-sm">Warsztat</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {warsztat.total_cost.toFixed(2)} PLN
                </p>
                <p className="text-xs text-gray-500">
                  {warsztat.count} serwisów ({warsztatPercentage.toFixed(1)}%)
                </p>
                {warsztat.count > 0 && (
                  <p className="text-xs text-gray-500">
                    Śr: {(warsztat.total_cost / warsztat.count).toFixed(2)} PLN
                  </p>
                )}
              </div>
            </div>

            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="font-medium text-sm">Samodzielnie</span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">
                  {samodzielnie.total_cost.toFixed(2)} PLN
                </p>
                <p className="text-xs text-gray-500">
                  {samodzielnie.count} serwisów (
                  {samodzielniePercentage.toFixed(1)}%)
                </p>
                {samodzielnie.count > 0 && (
                  <p className="text-xs text-gray-500">
                    Śr:{" "}
                    {(samodzielnie.total_cost / samodzielnie.count).toFixed(2)}{" "}
                    PLN
                  </p>
                )}
              </div>
            </div>
          </div>

          {totalCount === 0 && (
            <p className="text-center text-gray-500 py-4">
              Brak dostępnych danych lokalizacji
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
