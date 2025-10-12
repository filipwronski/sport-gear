import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorDisplayProps, ApiErrorResponse } from "./types";

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  const getErrorConfig = (error: Error | ApiErrorResponse) => {
    // Handle ApiErrorResponse
    if (error && typeof error === "object" && "error" in error) {
      const apiError = error.error;
      switch (apiError.code) {
        case "UNAUTHORIZED":
          return {
            title: "Brak dostępu",
            message: "Sesja wygasła. Zaloguj się ponownie.",
            icon: AlertCircle,
            canRetry: false,
          };
        case "LOCATION_NOT_FOUND":
          return {
            title: "Lokalizacja nie znaleziona",
            message: "Wybrana lokalizacja nie istnieje.",
            icon: AlertCircle,
            canRetry: true,
            retryLabel: "Spróbuj ponownie",
          };
        case "SERVICE_UNAVAILABLE":
          return {
            title: "Usługa niedostępna",
            message: "Serwer jest tymczasowo niedostępny. Spróbuj później.",
            icon: AlertCircle,
            canRetry: true,
            retryLabel: "Spróbuj ponownie",
          };
        default:
          return {
            title: "Błąd serwera",
            message: apiError.message || "Wystąpił nieoczekiwany błąd.",
            icon: AlertCircle,
            canRetry: true,
            retryLabel: "Spróbuj ponownie",
          };
      }
    }

    // Handle network errors
    if (
      error?.message?.includes("network") ||
      error?.message?.includes("fetch")
    ) {
      return {
        title: "Brak połączenia",
        message: "Sprawdź połączenie z internetem i spróbuj ponownie.",
        icon: AlertCircle,
        canRetry: true,
        retryLabel: "Spróbuj ponownie",
      };
    }

    // Handle other errors
    return {
      title: "Coś poszło nie tak",
      message: "Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę.",
      icon: AlertCircle,
      canRetry: true,
      retryLabel: "Spróbuj ponownie",
    };
  };

  const config = getErrorConfig(error);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
      <config.icon className="mb-4 h-16 w-16 text-red-500" />
      <h2 className="mb-2 text-xl font-semibold">{config.title}</h2>
      <p className="mb-6 max-w-md text-center text-gray-600">
        {config.message}
      </p>

      {config.canRetry && (
        <Button onClick={onRetry}>{config.retryLabel}</Button>
      )}
    </div>
  );
}
