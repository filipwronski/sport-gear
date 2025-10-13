import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useExport } from "./hooks";

export function ExportDataButton() {
  const { isExporting, error, exportData } = useExport();

  const handleExport = async () => {
    try {
      await exportData();
    } catch (err) {
      // Error is handled by the hook and can be shown via toast
      console.error("Export failed:", err);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Eksportowanie...
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Eksportuj dane (JSON)
        </>
      )}
    </Button>
  );
}
