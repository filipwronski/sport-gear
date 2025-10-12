import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceStatsDTO } from "../../types";

interface CostTimelineChartProps {
  stats: ServiceStatsDTO;
}

export function CostTimelineChart({ stats }: CostTimelineChartProps) {
  const maxCost = Math.max(...stats.timeline.map((entry) => entry.cost), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {stats.timeline.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No timeline data available
          </p>
        ) : (
          <div className="space-y-6">
            {/* Chart */}
            <div className="relative h-64">
              <div className="absolute inset-0 flex items-end justify-between gap-2">
                {stats.timeline.map((entry, index) => {
                  const heightPercentage = (entry.cost / maxCost) * 100;
                  return (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div className="w-full flex flex-col items-center justify-end h-full">
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer relative group"
                          style={{ height: `${heightPercentage}%` }}
                          title={`${entry.month}: ${entry.cost} PLN (${entry.services} services)`}
                        >
                          <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {entry.cost.toFixed(2)} PLN
                            <br />
                            {entry.services} services
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis labels */}
            <div className="flex justify-between text-xs text-gray-600">
              {stats.timeline.map((entry, index) => (
                <div key={index} className="flex-1 text-center">
                  {entry.month}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">Monthly Cost</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
