import React from "react";
import { ExportDataButton } from "./ExportDataButton";
import { DeleteAccountButton } from "./DeleteAccountButton";

interface ActionButtonsProps {
  onExportData: () => Promise<void>;
  onDeleteAccount: (password: string) => Promise<void>;
  isDeleting?: boolean;
}

export function ActionButtons({
  onExportData: _onExportData,
  onDeleteAccount,
  isDeleting = false,
}: ActionButtonsProps) {
  return (
    <div className="space-y-4">
      <div className="text-center sm:text-left">
        <p className="text-sm text-muted-foreground">
          Zgodnie z RODO masz prawo do eksportu wszystkich swoich danych w
          formacie JSON. Możesz również trwale usunąć swoje konto - ta akcja
          jest nieodwracalna.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-end">
        <ExportDataButton />
        <DeleteAccountButton
          onDeleteAccount={onDeleteAccount}
          isDeleting={isDeleting}
        />
      </div>
    </div>
  );
}
