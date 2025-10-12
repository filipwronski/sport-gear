import React from "react";
import { RefreshCw, Users, User } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

interface CommunityHeaderProps {
  onRefresh: () => void;
  activeTab?: "browse" | "shared";
  onTabChange?: (tab: "browse" | "shared") => void;
  isRefreshing?: boolean;
}

export default function CommunityHeader({
  onRefresh,
  activeTab = "browse",
  onTabChange,
  isRefreshing = false,
}: CommunityHeaderProps) {
  const handleRefresh = () => {
    if (!isRefreshing) {
      onRefresh();
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title and description */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Społeczność
            </h1>
            <p className="text-gray-600 mt-1">
              Odkryj zestawy ubioru innych kolarzy w Twojej okolicy
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                onTabChange?.(value as "browse" | "shared")
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="browse" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Przeglądaj
                </TabsTrigger>
                <TabsTrigger value="shared" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Moje udostępnione
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
              title="Odśwież dane"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Odśwież</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
