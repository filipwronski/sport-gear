import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
}: DeleteAccountModalProps) {
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleClose = () => {
    if (!isDeleting) {
      setPassword("");
      setConfirmed(false);
      onClose();
    }
  };

  const handleConfirm = async () => {
    if (!password.trim() || !confirmed) return;

    try {
      await onConfirm(password);
      // Success - close modal and reset state
      setPassword("");
      setConfirmed(false);
      onClose();
    } catch (error) {
      // Error handling is done by parent component
      console.error("Delete account failed:", error);
    }
  };

  const canDelete = password.trim().length >= 8 && confirmed && !isDeleting;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] mx-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive text-lg sm:text-xl">
            <AlertTriangle className="h-5 w-5" />
            Usuń konto
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Ta akcja jest nieodwracalna. Wszystkie Twoje dane zostaną trwale usunięte.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Hasło
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wprowadź hasło"
              disabled={isDeleting}
              className="w-full"
            />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Wymagane minimum 8 znaków
            </p>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="confirm-delete"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              disabled={isDeleting}
              className="mt-0.5"
            />
            <div className="grid gap-1.5 leading-none flex-1">
              <Label
                htmlFor="confirm-delete"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Potwierdzam usunięcie konta
              </Label>
              <p className="text-xs text-muted-foreground">
                Rozumiem, że ta akcja jest nieodwracalna i wszystkie moje dane zostaną usunięte.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Anuluj
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canDelete}
            className="w-full sm:w-auto"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Usuwanie...
              </>
            ) : (
              "Usuń konto"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
