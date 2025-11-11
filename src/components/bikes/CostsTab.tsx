import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { CostKPIs } from "./CostKPIs";
import { CostBreakdownChart } from "./CostBreakdownChart";
import { CostTimelineChart } from "./CostTimelineChart";
import { CostLocationBreakdown } from "./CostLocationBreakdown";
import { useServiceStats } from "./hooks/useServiceStats";
import type { GetServiceStatsParams } from "../../types";

interface CostsTabProps {
  bikeId: string;
}

export function CostsTab({ bikeId }: CostsTabProps) {
  const [filters, setFilters] = useState<GetServiceStatsParams>({
    period: "year",
  });

  const { stats, isLoading, error, refetch } = useServiceStats(bikeId, filters);

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="font-medium">Błąd ładowania statystyk kosztów</p>
            <p className="text-sm mt-1">{error}</p>
            <Button onClick={refetch} className="mt-4" variant="outline">
              Spróbuj ponownie
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">
              Ładowanie statystyk kosztów...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <p className="text-gray-500">Brak dostępnych danych kosztowych</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Analiza kosztów</CardTitle>
          <CardDescription>
            Analizuj koszty konserwacji i wzorce wydatków w czasie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="period">Okres czasu</Label>
              <select
                id="period"
                value={filters.period || "year"}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    period: e.target.value as GetServiceStatsParams["period"],
                    from_date: undefined,
                    to_date: undefined,
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">Ostatni miesiąc</option>
                <option value="quarter">Ostatni kwartał</option>
                <option value="year">Ostatni rok</option>
                <option value="all">Cały okres</option>
              </select>
            </div>

            {filters.period === "all" && (
              <>
                <div className="flex-1">
                  <Label htmlFor="from-date">Od daty</Label>
                  <input
                    id="from-date"
                    type="date"
                    value={filters.from_date || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, from_date: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex-1">
                  <Label htmlFor="to-date">Do daty</Label>
                  <input
                    id="to-date"
                    type="date"
                    value={filters.to_date || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, to_date: e.target.value })
                    }
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <CostKPIs stats={stats} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostBreakdownChart stats={stats} />
        <CostLocationBreakdown stats={stats} />
      </div>

      {/* Timeline */}
      <CostTimelineChart stats={stats} />

      {/* Empty state */}
      {stats.total_services === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Brak danych kosztowych
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Rozpocznij śledzenie kosztów konserwacji roweru, dodając
                rekordy serwisowe.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
