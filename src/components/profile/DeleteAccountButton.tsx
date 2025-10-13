import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DeleteAccountModal } from "./DeleteAccountModal";

interface DeleteAccountButtonProps {
  onDeleteAccount: (password: string) => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteAccountButton({
  onDeleteAccount,
  isDeleting = false,
}: DeleteAccountButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleConfirmDelete = async (password: string) => {
    await onDeleteAccount(password);
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleOpenModal}
        disabled={isDeleting}
        className="flex items-center gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Usuń konto
      </Button>

      <DeleteAccountModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
}
