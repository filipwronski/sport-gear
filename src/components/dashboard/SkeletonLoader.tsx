import { Skeleton } from "@/components/ui/skeleton";

export function SkeletonLoader() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Skeleton className="mb-6 h-8 w-48" /> {/* Header */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" /> {/* Weather */}
        <Skeleton className="h-48" /> {/* Recommendation */}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64" /> {/* Equipment */}
        <Skeleton className="h-64" /> {/* Community */}
      </div>
      <Skeleton className="mt-6 h-24" /> {/* Personalization */}
      <Skeleton className="mt-6 h-16" /> {/* Quick Actions */}
    </div>
  );
}
