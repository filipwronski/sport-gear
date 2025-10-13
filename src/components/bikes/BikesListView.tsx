import React, { useEffect, useState } from "react";
import { Plus, Bike } from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../auth/useToast";
import type { BikeDTO } from "../../types";

export default function BikesListView() {
  const [bikes, setBikes] = useState<BikeDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchBikes();
  }, []);

  const fetchBikes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/bikes");

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch bikes");
      }

      const data = await response.json();
      setBikes(data.bikes || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      showToast({
        type: "error",
        title: "Błąd",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBike = () => {
    // TODO: Implement add bike functionality
    showToast({
      type: "info",
      title: "Funkcja w trakcie implementacji",
      description: "Dodawanie rowerów będzie dostępne wkrótce",
    });
  };

  const handleBikeClick = (bikeId: string) => {
    window.location.href = `/bikes/${bikeId}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Ładowanie rowerów...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchBikes}>Spróbuj ponownie</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Moje rowery</h1>
            <p className="text-gray-600 mt-2">
              Zarządzaj swoimi rowerami i śledź ich historię serwisowania
            </p>
          </div>
          <Button onClick={handleAddBike} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Dodaj rower</span>
          </Button>
        </div>

        {bikes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Bike className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Brak rowerów</CardTitle>
              <CardDescription className="mb-6">
                Nie masz jeszcze żadnych rowerów w systemie. Dodaj swój pierwszy rower, aby rozpocząć śledzenie.
              </CardDescription>
              <Button onClick={handleAddBike}>Dodaj pierwszy rower</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bikes.map((bike) => (
              <Card
                key={bike.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleBikeClick(bike.id)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bike className="h-5 w-5" />
                    <span>{bike.name}</span>
                  </CardTitle>
                  <CardDescription>
                    {bike.type} • {bike.current_mileage} km
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      <span className={`px-2 py-1 rounded text-xs ${
                        bike.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {bike.status === "active" ? "Aktywny" : "Nieaktywny"}
                      </span>
                    </div>
                    {bike.purchase_date && (
                      <div>
                        <span className="font-medium">Data zakupu:</span>{" "}
                        {new Date(bike.purchase_date).toLocaleDateString("pl-PL")}
                      </div>
                    )}
                    {bike.notes && (
                      <div>
                        <span className="font-medium">Notatki:</span>{" "}
                        <span className="truncate block">{bike.notes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
