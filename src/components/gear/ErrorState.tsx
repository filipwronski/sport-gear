import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: Error | string;
  onRetry: () => void;
}

export const ErrorState = ({ error, onRetry }: ErrorStateProps) => {
  const errorMessage = typeof error === "string" ? error : error.message;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Wystąpił błąd
      </h3>
      <p className="text-sm text-gray-500 text-center mb-6 max-w-md">
        {errorMessage || "Nie udało się pobrać listy rowerów. Spróbuj ponownie."}
      </p>
      <Button onClick={onRetry} variant="outline" className="flex items-center space-x-2">
        <RefreshCw className="w-4 h-4" />
        <span>Spróbuj ponownie</span>
      </Button>
    </div>
  );
};
