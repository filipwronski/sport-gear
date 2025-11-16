import { useState, useEffect, useCallback } from "react";
import { BikeHeader } from "./BikeHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ServiceHistoryTab } from "./ServiceHistoryTab";
import { RemindersTab } from "./RemindersTab";
import { CostsTab } from "./CostsTab";
import type { BikeDTO } from "../../types";

interface BikeDetailsViewProps {
  bikeId: string;
}

export default function BikeDetailsView({ bikeId }: BikeDetailsViewProps) {
  const [bike, setBike] = useState<BikeDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBikeDetails = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/bikes/${bikeId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Rower nie został znaleziony");
        }
        throw new Error("Nie udało się załadować szczegółów roweru");
      }

      const data = await response.json();
      setBike(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [bikeId]);

  useEffect(() => {
    fetchBikeDetails();
  }, [fetchBikeDetails]);

  const handleMileageUpdate = (newMileage: number) => {
    if (bike) {
      setBike({ ...bike, current_mileage: newMileage });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie szczegółów roweru...</p>
        </div>
      </div>
    );
  }

  if (error || !bike) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Błąd</h2>
          <p className="text-gray-600 mb-4">
            {error || "Rower nie został znaleziony"}
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Wróć do strony głównej
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <BikeHeader bike={bike} onMileageUpdate={handleMileageUpdate} />

      <Tabs defaultValue="history" className="mt-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="history" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Historia serwisowania</span>
            <span className="sm:hidden">Historia</span>
          </TabsTrigger>
          <TabsTrigger
            value="reminders"
            className="text-xs sm:text-sm px-2 py-2"
          >
            <span className="hidden sm:inline">Przypomnienia</span>
            <span className="sm:hidden">Przypomnienia</span>
          </TabsTrigger>
          <TabsTrigger value="costs" className="text-xs sm:text-sm px-2 py-2">
            <span className="hidden sm:inline">Koszty</span>
            <span className="sm:hidden">Koszty</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-6">
          <ServiceHistoryTab
            bikeId={bikeId}
            currentMileage={bike?.current_mileage}
          />
        </TabsContent>

        <TabsContent value="reminders" className="mt-6">
          <RemindersTab
            bikeId={bikeId}
            bikeMileage={bike.current_mileage || 0}
          />
        </TabsContent>

        <TabsContent value="costs" className="mt-6">
          <CostsTab bikeId={bikeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
