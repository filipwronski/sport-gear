import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ServiceStatsDTO } from "../../types";

interface CostBreakdownChartProps {
  stats: ServiceStatsDTO;
}

export function CostBreakdownChart({ stats }: CostBreakdownChartProps) {
  const serviceTypeLabels: Record<string, string> = {
    lancuch: "Chain",
    kaseta: "Cassette",
    klocki_przod: "Front Brake Pads",
    klocki_tyl: "Rear Brake Pads",
    opony: "Tires",
    przerzutki: "Derailleurs",
    hamulce: "Brakes",
    przeglad_ogolny: "General Service",
    inne: "Other",
  };

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown by Service Type</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.breakdown_by_type.map((item, index) => (
            <div key={item.service_type}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">
                  {serviceTypeLabels[item.service_type] || item.service_type}
                </span>
                <span className="text-gray-600">
                  {item.total_cost.toFixed(2)} PLN ({item.percentage.toFixed(1)}
                  %)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${colors[index % colors.length]}`}
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{item.count} services</span>
                <span>Avg: {item.avg_cost.toFixed(2)} PLN</span>
              </div>
            </div>
          ))}
        </div>

        {stats.breakdown_by_type.length === 0 && (
          <p className="text-center text-gray-500 py-8">
            No service data available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
