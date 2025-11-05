import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BikeForm } from "./BikeForm";
import type { CreateBikeCommand } from "../../types";

interface AddBikeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (bike: any) => void; // TODO: Replace with proper BikeDTO type
  isSubmitting?: boolean;
}

export const AddBikeDialog = ({
  open,
  onOpenChange,
  onSuccess,
  isSubmitting = false,
}: AddBikeDialogProps) => {
  const handleSubmit = async (data: CreateBikeCommand) => {
    try {
      // This will be handled by the parent component
      await onSuccess(data as any); // TODO: Fix type
    } catch (error) {
      // Error handling is done in the parent component
      throw error;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Don't allow closing while submitting
    if (isSubmitting && !newOpen) return;
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dodaj nowy rower</DialogTitle>
        </DialogHeader>

        <BikeForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Anuluj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
