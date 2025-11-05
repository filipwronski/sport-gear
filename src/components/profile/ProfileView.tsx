import React, { useEffect } from "react";
import { PersonalInfoSection } from "./PersonalInfoSection";
import { ThermalPreferencesSection } from "./ThermalPreferencesSection";
import { PrivacySettingsSection } from "./PrivacySettingsSection";
import { UnitsSettingsSection } from "./UnitsSettingsSection";
import { PersonalizationStatus } from "./PersonalizationStatus";
import { FeedbackHistorySection } from "./FeedbackHistorySection";
import { ActionButtons } from "./ActionButtons";
import { useProfile } from "./hooks/useProfile";
import { useLocations } from "./hooks/useLocations";
import { useExport } from "./hooks/useExport";
import { useToast } from "../auth/useToast";
import type {
  UpdateProfileCommand,
  ThermalPreferences,
  UnitsEnum,
  ProfileDTO,
  LocationDTO,
} from "../../types";

export function ProfileView({
  userId,
  initialProfile,
  initialLocations,
}: {
  userId?: string;
  initialProfile?: ProfileDTO | null;
  initialLocations?: LocationDTO[];
}) {
  const { showToast } = useToast();

  // Custom hooks for data management
  const {
    profile,
    isLoading: profileLoading,
    isUpdating: profileUpdating,
    error: profileError,
    fetchProfile,
    updateProfile,
    deleteAccount,
  } = useProfile(initialProfile);

  const {
    locations,
    isLoading: isLoadingLocations,
    fetchLocations,
    createLocation,
    updateLocation,
  } = useLocations(initialLocations);

  const { exportData } = useExport();

  // Load initial data only if we don't have initial data
  useEffect(() => {
    const shouldLoadData = !initialProfile || !initialLocations;

    if (shouldLoadData) {
      const loadData = async () => {
        try {
          await Promise.all([fetchProfile(), fetchLocations()]);
        } catch (error) {
          console.error(`[ProfileView] Error loading data:`, error);
          // Error will be handled by individual hooks
        }
      };

      loadData();
    }
  }, [fetchProfile, fetchLocations, userId, initialProfile, initialLocations]);

  // Handle profile updates
  const handleProfileUpdate = async (
    command: Partial<UpdateProfileCommand>,
  ) => {
    try {
      await updateProfile(command);
      showToast({
        type: "success",
        title: "Profil zaktualizowany",
        description: "Twoje zmiany zostały zapisane pomyślnie.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Błąd aktualizacji",
        description: "Nie udało się zaktualizować profilu. Spróbuj ponownie.",
      });
      throw error; // Re-throw to allow component-level error handling
    }
  };

  // Handle thermal preferences update
  const handleThermalPreferencesUpdate = async (
    preferences: ThermalPreferences,
  ) => {
    try {
      await updateProfile({ thermal_preferences: preferences });
      showToast({
        type: "success",
        title: "Preferencje termiczne zaktualizowane",
        description: "Twoje ustawienia zostały zapisane.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Błąd aktualizacji",
        description: "Nie udało się zaktualizować preferencji termicznych.",
      });
      throw error;
    }
  };

  // Handle privacy settings update
  const handlePrivacyUpdate = async (shareWithCommunity: boolean) => {
    try {
      await updateProfile({ share_with_community: shareWithCommunity });
      showToast({
        type: "success",
        title: "Ustawienia prywatności zaktualizowane",
        description: shareWithCommunity
          ? "Twoje zestawy będą widoczne dla społeczności."
          : "Twoje zestawy są teraz prywatne.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Błąd aktualizacji",
        description: "Nie udało się zaktualizować ustawień prywatności.",
      });
      throw error;
    }
  };

  // Handle units settings update
  const handleUnitsUpdate = async (units: UnitsEnum) => {
    try {
      await updateProfile({ units });
      showToast({
        type: "success",
        title: "Jednostki zaktualizowane",
        description: `Przełączono na jednostki ${units === "metric" ? "metryczne" : "imperialne"}.`,
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Błąd aktualizacji",
        description: "Nie udało się zaktualizować jednostek.",
      });
      throw error;
    }
  };

  // Handle data export
  const handleExportData = async () => {
    try {
      await exportData();
      showToast({
        type: "success",
        title: "Eksport zakończony",
        description: "Plik JSON został pobrany na Twoje urządzenie.",
      });
    } catch (_error) {
      showToast({
        type: "error",
        title: "Błąd eksportu",
        description: "Nie udało się wyeksportować danych. Spróbuj ponownie.",
      });
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async (_password: string) => {
    try {
      await deleteAccount();
      showToast({
        type: "success",
        title: "Konto zostało usunięte",
        description: "Zostaniesz przekierowany na stronę logowania.",
      });
      // Redirect to login after successful deletion
      setTimeout(() => {
        window.location.href = "/auth";
      }, 2000);
    } catch (error) {
      showToast({
        type: "error",
        title: "Błąd usunięcia konta",
        description:
          "Nie udało się usunąć konta. Sprawdź hasło i spróbuj ponownie.",
      });
      throw error;
    }
  };

  // Handle start quiz (redirect to quiz flow)
  const handleStartQuiz = () => {
    // This would navigate to the thermal preferences quiz
    // For now, just show a message
    showToast({
      type: "info",
      title: "Quiz termiczny",
      description: "Funkcjonalność quizu zostanie dodana wkrótce.",
    });
  };

  // Show loading state
  if (profileLoading || !profile) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (profileError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Błąd ładowania profilu
          </h2>
          <p className="text-gray-600 mb-6">
            Nie udało się załadować danych profilu. Spróbuj odświeżyć stronę.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Odśwież stronę
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Profil użytkownika
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Zarządzaj swoimi danymi osobowymi, preferencjami i ustawieniami konta
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Personal Information */}
        <PersonalInfoSection
          profile={profile}
          locations={locations}
          isLoadingLocations={isLoadingLocations}
          onUpdate={handleProfileUpdate}
          onCreateLocation={createLocation}
          onUpdateLocation={updateLocation}
        />

        {/* Thermal Preferences */}
        <ThermalPreferencesSection
          preferences={profile.thermal_preferences}
          onUpdate={handleThermalPreferencesUpdate}
          onStartQuiz={handleStartQuiz}
        />

        {/* Settings Grid - Privacy and Units side by side on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Privacy Settings */}
          <PrivacySettingsSection
            shareWithCommunity={profile.share_with_community ?? false}
            onUpdate={handlePrivacyUpdate}
          />

          {/* Units Settings */}
          <UnitsSettingsSection
            units={profile.units}
            onUpdate={handleUnitsUpdate}
          />
        </div>

        {/* Personalization Status */}
        <PersonalizationStatus profile={profile} />

        {/* Feedback History */}
        <FeedbackHistorySection />

        {/* Action Buttons */}
        <div className="bg-gray-50 -mx-4 px-4 py-4 sm:py-6 rounded-lg mt-6 sm:mt-8">
          <ActionButtons
            onExportData={handleExportData}
            onDeleteAccount={handleDeleteAccount}
            isDeleting={profileUpdating}
          />
        </div>
      </div>
    </div>
  );
}
