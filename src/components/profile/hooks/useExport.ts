import { useState, useCallback } from "react";
import type { ProfileExportDTO } from "../../../types";

export interface UseExportReturn {
  isExporting: boolean;
  error: Error | null;
  exportData: () => Promise<void>;
}

/**
 * Custom hook for exporting user profile data
 * Handles GDPR-compliant data export functionality
 */
export function useExport(): UseExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const downloadJsonFile = useCallback(
    (data: ProfileExportDTO, filename: string) => {
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    },
    [],
  );

  const exportData = useCallback(async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/profile/export", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const exportData: ProfileExportDTO = await response.json();

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `profile-export-${timestamp}.json`;

      downloadJsonFile(exportData, filename);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Unknown error occurred");
      setError(error);
      throw error; // Re-throw to allow component-level error handling
    } finally {
      setIsExporting(false);
    }
  }, [downloadJsonFile]);

  return {
    isExporting,
    error,
    exportData,
  };
}
