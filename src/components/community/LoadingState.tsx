import React from "react";
import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

interface LoadingStateProps {
  count?: number;
}

export default function LoadingState({ count = 9 }: LoadingStateProps) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: count }, (_, i) => (
          <Card key={i} className="border border-gray-200">
            <CardContent className="p-4">
              {/* Header skeleton */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>

              {/* Weather skeleton */}
              <div className="flex items-center gap-4 mb-3 p-2 bg-gray-50 rounded-lg">
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-6 rounded" />
              </div>

              {/* Outfit icons skeleton */}
              <div className="grid grid-cols-7 gap-1 mb-3">
                {Array.from({ length: 7 }, (_, j) => (
                  <div
                    key={j}
                    className="flex flex-col items-center p-1 rounded bg-gray-50"
                  >
                    <Skeleton className="h-3 w-3 mb-1" />
                    <Skeleton className="h-4 w-4 rounded" />
                  </div>
                ))}
              </div>

              {/* Footer skeleton */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }, (_, j) => (
                      <Skeleton key={j} className="h-3 w-3" />
                    ))}
                  </div>
                </div>
                <Skeleton className="h-3 w-12" />
              </div>

              {/* Button skeleton */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
