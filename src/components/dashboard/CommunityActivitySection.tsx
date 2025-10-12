import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivityStats } from "./ActivityStats";
import type { CommunityActivitySectionProps } from "./types";

export function CommunityActivitySection({
  data,
}: CommunityActivitySectionProps) {
  const handleViewCommunity = () => {
    window.location.href = "/community/outfits";
  };

  return (
    <section aria-labelledby="community-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="community-heading" className="text-xl font-semibold">
          Co ubierają inni
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleViewCommunity}
          className="text-sm"
        >
          Zobacz więcej
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <div className="space-y-4">
        <ActivityStats
          recentCount={data.recent_outfits_count}
          similarCount={data.similar_conditions_count}
        />

        <Button
          onClick={handleViewCommunity}
          variant="outline"
          className="w-full"
        >
          <Users className="h-4 w-4 mr-2" />
          Przeglądaj zestawy społeczności
        </Button>
      </div>
    </section>
  );
}
